// Re-run buttons: one domain for one document or country, or everything for a document or country.
import { checkCap, estimateDocumentDomain, estimateSynthesis } from "./cost";
import { db } from "./db";
import { UserError } from "./errors";
import { enqueue } from "./jobs";
import { loadTaxonomy } from "./taxonomy";
import { isDemoId } from "./ai-mode";

export async function rerun(input: { documentId?: string; countryId?: string; domainId?: string }) {
  const tax = await loadTaxonomy();
  const domains = tax.domains.filter((d) => d.enabled && (!input.domainId || d.id === input.domainId));
  if (input.domainId && domains.length === 0) throw new UserError(`Domain ${input.domainId} is not active`, 404);

  if (input.documentId) {
    const doc = await db.document.findUnique({ where: { id: input.documentId }, include: { country: true } });
    if (!doc || doc.status === "deleting") throw new UserError(`No document ${input.documentId}`, 404);
    const needsLiveIndex = process.env.OPENAI_FAKE !== "1" && (isDemoId(doc.country.vectorStoreId) || await db.page.count({ where: { documentId: doc.id, openaiFileId: { contains: "_fake_" } } }) > 0);
    if ((doc.status === "failed" && !doc.pageCount) || needsLiveIndex) {
      // Ingestion never finished: start it again.
      await db.document.update({ where: { id: doc.id }, data: { status: "uploaded", error: null } });
      await enqueue("ingest_document", { documentId: doc.id }, { countryId: doc.countryId });
      return { queued: 1, estimateUsd: null };
    }
    if (!["analysing", "analysed", "partial", "failed"].includes(doc.status)) throw new UserError(`${doc.id} is still being read`, 409);
    const documentCount = await db.document.count({ where: { countryId: doc.countryId, status: { notIn: ["deleting", "failed"] } } });
    const usd = domains.length * (estimateDocumentDomain() + estimateSynthesis(documentCount));
    const cap = checkCap(usd);
    if (cap) throw new UserError(cap, 402);
    await db.$transaction(async (tx) => {
      await tx.document.update({ where: { id: doc.id }, data: { status: "analysing", error: null } });
      for (const d of domains) await enqueue("analyse_document_domain", { documentId: doc.id, domainId: d.id }, { countryId: doc.countryId, tx });
      // Country summaries depend on the document answers, so they follow.
      for (const d of domains) {
        await enqueue("synthesise_country_domain", { countryId: doc.countryId, domainId: d.id }, { runAfter: new Date(Date.now() + 3000), tx });
      }
    });
    return { queued: domains.length, estimateUsd: usd };
  }

  if (input.countryId) {
    const country = await db.country.findUnique({
      where: { id: input.countryId },
      include: { documents: { where: { status: { in: ["analysing", "analysed", "partial"] } } } },
    });
    if (!country || country.status !== "active") throw new UserError("No such country", 404);
    const usd = domains.length * estimateSynthesis(country.documents.length);
    const cap = checkCap(usd);
    if (cap) throw new UserError(cap, 402);
    for (const d of domains) await enqueue("synthesise_country_domain", { countryId: country.id, domainId: d.id });
    return { queued: domains.length, estimateUsd: usd };
  }
  throw new UserError("Give a document or a country");
}
