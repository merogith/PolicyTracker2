import { createHash } from "node:crypto";
import { checkCap, estimateDocument, estimateSynthesis } from "./cost";
import { db } from "./db";
import { DATE_PATTERN, KIND_PATTERN } from "./domain";
import { UserError } from "./errors";
import { enqueue } from "./jobs";
import { countPages } from "./pdf";
import { pdfRelativePath, savePdf } from "./storage";
import { loadTaxonomy } from "./taxonomy";

export interface UploadInput {
  iso3: string;
  title: string;
  kind: string;
  editionDate: string;
  language?: string | null;
  originalName: string;
  data: Buffer;
}

function isPdf(data: Buffer) {
  return data.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Store the PDF, create the document row with status "uploaded", and queue its ingestion. */
export async function createDocument(input: UploadInput) {
  const country = await db.country.findFirst({ where: { iso3: input.iso3.toUpperCase(), status: "active" } });
  if (!country) throw new UserError(`No country ${input.iso3}`, 404);
  const kind = input.kind.trim().toUpperCase();
  const title = input.title.trim();
  const editionDate = input.editionDate.trim();
  if (!KIND_PATTERN.test(kind)) throw new UserError("Kind must be 2 to 8 capital letters, e.g. NDC");
  if (!title) throw new UserError("Title is required");
  if (!DATE_PATTERN.test(editionDate)) throw new UserError("Edition date must be YYYY-MM-DD");
  if (!isPdf(input.data)) throw new UserError("The file is not a PDF");

  const sha256 = createHash("sha256").update(input.data).digest("hex");
  const duplicate = await db.document.findFirst({ where: { countryId: country.id, sha256, status: { not: "deleting" } } });
  if (duplicate) throw new UserError(`This PDF is already uploaded as ${duplicate.id}`, 409);

  // Estimate the analysis before accepting the file, and refuse it over the cost cap.
  let pageCount: number;
  try {
    pageCount = await countPages(input.data);
  } catch (err) {
    throw new UserError(`The PDF cannot be read: ${err instanceof Error ? err.message : String(err)}`);
  }
  const domains = (await loadTaxonomy()).domains.filter((d) => d.enabled);
  const docCount = await db.document.count({ where: { countryId: country.id, status: { notIn: ["deleting", "failed"] } } });
  const estimateUsd = estimateDocument(domains.length).usd + domains.length * estimateSynthesis(docCount + 1);
  const cap = checkCap(estimateUsd);
  if (cap) throw new UserError(`${cap} Raise MAX_USD_PER_RUN or disable domains before uploading.`, 402);

  const doc = await db.$transaction(async (tx) => {
    // Sequence numbers are never reused, so a deleted KAZ-NDC2 is not reborn as another document.
    const fresh = await tx.country.findUniqueOrThrow({ where: { id: country.id } });
    const counters = (fresh.docCounters ?? {}) as Record<string, number>;
    const kindSeq = (counters[kind] ?? 0) + 1;
    await tx.country.update({ where: { id: country.id }, data: { docCounters: { ...counters, [kind]: kindSeq } } });

    const id = `${country.iso3}-${kind}${kindSeq}`;
    const pdfPath = pdfRelativePath(country.iso3, id);
    await savePdf(pdfPath, input.data);
    const doc = await tx.document.create({
      data: {
        id,
        countryId: country.id,
        title,
        kind,
        kindSeq,
        editionDate,
        language: input.language?.trim() || null,
        pdfPath,
        originalName: input.originalName,
        sha256,
        status: "uploaded",
      },
    });
    await enqueue("ingest_document", { documentId: id }, { countryId: country.id, tx });
    return doc;
  });
  return { ...doc, estimateUsd, pageCount };
}

/** Mark the document as deleting and queue the clean-up. Its results disappear from the dashboard at once. */
export async function deleteDocument(documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new UserError(`No document ${documentId}`, 404);
  await db.$transaction(async (tx) => {
    await tx.document.update({ where: { id: documentId }, data: { status: "deleting" } });
    await tx.job.updateMany({
      where: { documentId, status: "queued", type: { in: ["ingest_document", "analyse_document_domain", "retag_result"] } },
      data: { status: "cancelled", finishedAt: new Date(), error: "document deleted" },
    });
    await enqueue("delete_document", { documentId }, { countryId: doc.countryId, tx });
  });
}

/** Once no analysis job is left for a document that is being analysed, mark it analysed. */
export async function refreshDocumentStatus(documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc || !["analysing", "analysed", "partial"].includes(doc.status)) return;
  const pending = await db.job.count({
    where: { documentId, type: "analyse_document_domain", status: { in: ["queued", "running"] } },
  });
  if (pending === 0) {
    const domains = await db.domain.findMany({ where: { enabled: true, retiredAt: null }, select: { id: true, version: true } });
    const results = await db.analysisResult.findMany({ where: { documentId, scope: "document" } });
    const incomplete = domains.filter(d => {
      const result = results.find(r => r.domainId === d.id && r.domainVersion === d.version);
      const labeling = (result?.sources as { labeling?: { status?: string } } | null)?.labeling;
      return !result || result.status !== "done" || (labeling && labeling.status !== "complete");
    }).length;
    await db.document.update({ where: { id: documentId }, data: {
      status: incomplete ? "partial" : "analysed", error: incomplete ? `${incomplete} domain(s) have incomplete analysis or classification` : null,
    } });
  }
}
