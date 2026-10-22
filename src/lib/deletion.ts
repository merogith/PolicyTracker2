import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { enqueue } from "./jobs";
import { openai } from "./openai";
import { deletePdf, storageDir } from "./storage";
import { loadTaxonomy } from "./taxonomy";
import { reportSourceHashes, pruneReportSources } from "./report-files";

/** Remove a document's page files from the vector store and delete its files at OpenAI. */
async function cleanUpOpenAI(documentId: string, vectorStoreId: string | null) {
  const ai = openai();
  const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });
  const pages = await db.page.findMany({ where: { documentId, openaiFileId: { not: null } } });
  for (const p of pages) {
    if (vectorStoreId) await ai.detachFile(vectorStoreId, p.openaiFileId!);
    await ai.deleteFile(p.openaiFileId!);
    await db.page.update({ where: { documentId_page: { documentId, page: p.page } }, data: { openaiFileId: null } });
  }
  if (doc.openaiFileId) {
    await ai.deleteFile(doc.openaiFileId);
    await db.document.update({ where: { id: documentId }, data: { openaiFileId: null } });
  }
}

/** Delete a document everywhere, then re-run the country summaries without it. */
export async function deleteDocumentEverywhere(documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { country: true } });
  if (!doc) return;
  await cleanUpOpenAI(doc.id, doc.country.vectorStoreId);
  await deletePdf(doc.pdfPath);
  // Results, citations and pages go with the row (cascade), including citations copied into country summaries.
  await db.document.delete({ where: { id: doc.id } });

  if (doc.country.status !== "active") return;
  for (const d of (await loadTaxonomy()).domains.filter((x) => x.enabled)) {
    await enqueue("synthesise_country_domain", { countryId: doc.countryId, domainId: d.id });
  }
}

/** Delete a country, its documents and results, its files at OpenAI and its vector store. */
export async function deleteCountryEverywhere(countryId: string) {
  const country = await db.country.findUnique({ where: { id: countryId } });
  if (!country) return;
  const docs = await db.document.findMany({ where: { countryId } });
  const reports = await db.countryReport.findMany({ where: { countryId }, select: { snapshot: true } });
  const archivedSources = [...docs.map(doc => doc.sha256), ...reports.flatMap(report => reportSourceHashes(report.snapshot))];
  for (const d of docs) await cleanUpOpenAI(d.id, country.vectorStoreId);
  if (country.vectorStoreId) await openai().deleteVectorStore(country.vectorStoreId);
  await rm(path.join(storageDir(), country.iso3), { recursive: true, force: true });
  await db.country.delete({ where: { id: countryId } });
  await pruneReportSources(archivedSources);
}
