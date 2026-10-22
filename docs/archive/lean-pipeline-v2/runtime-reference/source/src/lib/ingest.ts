import { db } from "./db";
import { checkCap, estimateDocument, estimateSynthesis } from "./cost";
import { Defer, enqueue, Permanent } from "./jobs";
import { openai, type Attributes } from "./openai";
import { extractPages } from "./pdf";
import { readPdf } from "./storage";
import { loadTaxonomy } from "./taxonomy";

const INDEX_TIMEOUT_MS = 15 * 60 * 1000;

/** The text file stored in the vector store for one page. The header carries the page number into every chunk. */
export function pageFileText(doc: { id: string; kind: string; editionDate: string }, page: number, pageCount: number, text: string) {
  return `Document ${doc.id} (${doc.kind}, ${doc.editionDate}), page ${page} of ${pageCount}\n\n${text}`;
}

export function pageFileName(documentId: string, page: number) {
  return `${documentId}-p${page}.txt`;
}

/**
 * Upload the PDF and its pages to OpenAI, wait for indexing, then queue the analysis.
 * Each step records what it has done, so a retry continues where the last attempt stopped.
 */
export async function ingestDocument(documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { country: true } });
  if (!doc || doc.status === "deleting") return;
  const country = doc.country;
  if (!country.vectorStoreId) throw new Permanent(`Country ${country.iso3} has no vector store`);
  const ai = openai();

  await db.document.update({ where: { id: doc.id }, data: { status: "extracting", error: null } });
  const pdf = await readPdf(doc.pdfPath);

  // 1. The original PDF. Domain questions read pages through file search; the whole file is kept for
  //    a later direct-reading mode and deleted with the document.
  if (!doc.openaiFileId) {
    const fileId = await ai.uploadFile(`${doc.id}.pdf`, pdf, "user_data");
    await db.document.update({ where: { id: doc.id }, data: { openaiFileId: fileId } });
  }

  // 2. Text per page.
  let pages = await db.page.findMany({ where: { documentId: doc.id }, orderBy: { page: "asc" } });
  if (pages.length === 0) {
    const extracted = await extractPages(pdf);
    await db.page.createMany({
      data: extracted.map((p) => ({
        documentId: doc.id,
        page: p.page,
        label: p.label,
        text: p.text,
        disposition: p.readable ? "extracted" : "unreadable",
      })),
    });
    await db.document.update({ where: { id: doc.id }, data: { pageCount: extracted.length } });
    pages = await db.page.findMany({ where: { documentId: doc.id }, orderBy: { page: "asc" } });
  }
  const pageCount = pages.length;
  const readable = pages.filter((p) => p.disposition === "extracted");
  if (readable.length === 0) throw new Permanent("No page has extractable text (scanned PDF?). OCR is not supported yet.");

  // 3. One text file per readable page in the country's vector store.
  await db.document.update({ where: { id: doc.id }, data: { status: "indexing" } });
  await Promise.all(
    readable
      .filter((p) => !p.openaiFileId)
      .map(async (p) => {
        const fileId = await ai.uploadFile(
          pageFileName(doc.id, p.page),
          Buffer.from(pageFileText(doc, p.page, pageCount, p.text), "utf8"),
          "assistants",
        );
        await db.page.update({ where: { documentId_page: { documentId: doc.id, page: p.page } }, data: { openaiFileId: fileId } });
        p.openaiFileId = fileId;
      }),
  );

  const attributesFor = (page: number): Attributes => ({
    country: country.iso3,
    document_id: doc.id,
    page,
    kind: doc.kind,
    edition_date: doc.editionDate,
  });
  const wanted = new Map(readable.map((p) => [p.openaiFileId!, p.page]));
  let inStore = new Map((await ai.listStoreFiles(country.vectorStoreId)).map((f) => [f.id, f]));
  const missing = [...wanted].filter(([fileId]) => !inStore.has(fileId));
  if (missing.length) {
    await ai.attachFiles(
      country.vectorStoreId,
      missing.map(([fileId, page]) => ({ fileId, attributes: attributesFor(page) })),
    );
  }

  // 4. Wait until every page file is indexed; re-attach failed ones once.
  const started = Date.now();
  let reattached = false;
  for (;;) {
    inStore = new Map((await ai.listStoreFiles(country.vectorStoreId)).map((f) => [f.id, f]));
    const mine = [...wanted.keys()].map((id) => inStore.get(id));
    const failed = [...wanted].filter(([id]) => {
      const s = inStore.get(id)?.status;
      return s === "failed" || s === "cancelled" || s === undefined;
    });
    if (failed.length === 0 && mine.every((f) => f?.status === "completed")) break;
    if (failed.length && mine.every((f) => f?.status !== "in_progress")) {
      if (reattached) {
        const detail = failed.map(([id, page]) => `p${page}: ${inStore.get(id)?.error ?? "missing"}`).join("; ");
        throw new Error(`Indexing failed for ${failed.length} page file(s): ${detail}`);
      }
      for (const [id] of failed) if (inStore.has(id)) await ai.detachFile(country.vectorStoreId, id);
      await ai.attachFiles(country.vectorStoreId, failed.map(([id, page]) => ({ fileId: id, attributes: attributesFor(page) })));
      reattached = true;
      continue;
    }
    if (Date.now() - started > INDEX_TIMEOUT_MS) throw new Defer(60, "Vector store indexing is still in progress");
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 5. Queue one question per domain, and the country summaries, within the cost cap.
  const domains = (await loadTaxonomy()).domains.filter((d) => d.enabled);
  const docCount = await db.document.count({ where: { countryId: country.id, status: { notIn: ["deleting", "failed"] } } });
  const estimate = estimateDocument(domains.length).usd + domains.length * estimateSynthesis(docCount);
  const cap = checkCap(estimate);
  if (cap) throw new Permanent(`${cap} Raise MAX_USD_PER_RUN or disable domains, then re-run this document.`);

  await db.$transaction(async (tx) => {
    await tx.document.update({ where: { id: doc.id }, data: { status: domains.length ? "analysing" : "analysed" } });
    for (const d of domains) {
      await enqueue("analyse_document_domain", { documentId: doc.id, domainId: d.id }, { countryId: country.id, tx });
    }
    for (const d of domains) {
      await enqueue("synthesise_country_domain", { countryId: country.id, domainId: d.id }, { runAfter: new Date(Date.now() + 5000), tx });
    }
  });
}
