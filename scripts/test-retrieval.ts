// One question, no saved-answer or job mutations. Uses the same request and validation as the worker.
import "dotenv/config";
import { callStructured } from "../src/lib/analysis/call";
import { documentRequest } from "../src/lib/analysis/request";
import { citationLists, type DocCitation } from "../src/lib/analysis/schemas";
import { verifyQuote } from "../src/lib/analysis/verify";
import { checkCap, estimateDocumentDomain } from "../src/lib/cost";
import { db } from "../src/lib/db";
import { models, openai } from "../src/lib/openai";
import { loadTaxonomy } from "../src/lib/taxonomy";

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const documentId = arg("--document");
  const domainId = arg("--domain");
  if (!documentId || !domainId) throw new Error("Usage: npm run test:retrieval -- --document KAZ-NDC1 --domain water");
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { country: true, pages: true } });
  const tax = await loadTaxonomy();
  const domain = tax.domain(domainId);
  if (!doc || !domain) throw new Error("Document or domain not found");
  if (!["analysing", "analysed"].includes(doc.status)) throw new Error("Wait for document indexing to finish before testing");
  const storeId = doc.country.vectorStoreId;
  if (!storeId) throw new Error("Document has no vector store");
  const ai = openai();
  if (!ai.fake && storeId.includes("_fake_")) throw new Error("This document uses a demo vector store. Upload it into a real store before a live test.");
  const indexedFiles = new Set((await ai.listStoreFiles(storeId)).filter((f) => f.status === "completed").map((f) => f.id));
  const readable = doc.pages.filter((p) => p.disposition === "extracted");
  const missing = readable.filter((p) => !p.openaiFileId || !indexedFiles.has(p.openaiFileId));
  if (!readable.length || missing.length || doc.pages.length !== doc.pageCount) throw new Error("Incomplete index: every readable page must be indexed before the test");
  const cap = checkCap(estimateDocumentDomain());
  if (cap) throw new Error(cap);
  console.log(`${ai.fake ? "DEMO: local retrieval test, not model quality" : "LIVE API test"}; model=${models.analysis}; ${readable.length}/${doc.pages.length} pages indexed; no page-count cutoff`);
  const call = await callStructured(documentRequest(doc, domain, tax, models.analysis), ai);
  const pages = new Map(doc.pages.map((p) => [p.page, p]));
  const citations = citationLists<DocCitation>(call.output).flatMap((list) => list.citations);
  const verified = citations.filter((c) => verifyQuote(c.quote, c.page, pages).verified).length;
  console.log(JSON.stringify({
    mode: ai.fake ? "demo" : "live",
    model: models.analysis,
    documentId, domainId,
    totalPages: doc.pages.length,
    indexedPages: readable.length,
    unreadablePages: doc.pages.filter((p) => p.disposition === "unreadable").map((p) => p.page),
    passagesPerSearch: domain.maxResults,
    pagesReturned: [...new Set(call.retrieved.map((r) => Number(r.attributes.page ?? r.filename?.match(/-p(\d+)\.txt$/)?.[1])).filter(Number.isFinite))].sort((a, b) => a - b),
    searchCalls: call.fileSearchCalls,
    queries: call.queries,
    usage: call.usage,
    estimatedCostUsd: call.costUsd,
    citations: citations.length,
    verifiedCitations: verified,
    output: call.output,
  }, null, 2));
}

main().catch((err) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; }).finally(() => db.$disconnect());
