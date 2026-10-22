// Real API integration test with an isolated index. Never reuses fake stores or saves demo/live answers over each other.
import "dotenv/config";
import OpenAI from "openai";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { RealGateway, models } from "../src/lib/openai";
import { db } from "../src/lib/db";
import { loadTaxonomy } from "../src/lib/taxonomy";
import { pageFileName, pageFileText } from "../src/lib/ingest";
import { documentRequest } from "../src/lib/analysis/request";
import { callStructured } from "../src/lib/analysis/call";
import { citationLists, type DocCitation } from "../src/lib/analysis/schemas";

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const reportPath = path.resolve(arg("--report", "output/live-api-test.json")!);
const report: Record<string, unknown> = { status: "starting", mode: "live", startedAt: new Date().toISOString() };
async function save() {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
}
function safeError(err: unknown) {
  // Some provider error messages echo part of a rejected key. Never store it in reports or console output.
  const text = err instanceof Error ? err.message : String(err);
  const key = process.env.OPENAI_API_KEY?.trim();
  return (key ? text.replaceAll(key, "[redacted]") : text).replace(/sk-[\w*.-]+/g, "[redacted]");
}

async function main() {
  const documentId = arg("--document");
  const domainId = arg("--domain", "water")!;
  if (!documentId) throw new Error("Usage: npm run test:live -- --document KAZ-NDC1 --domain water");
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    report.status = "blocked_missing_api_key";
    throw new Error("OPENAI_API_KEY is empty. Save the key in this project's .env. No fake fallback and no API calls were made.");
  }
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { pages: { orderBy: { page: "asc" } } } });
  const tax = await loadTaxonomy();
  const domain = tax.domain(domainId);
  if (!doc || !domain) throw new Error("Document or domain not found");
  const readable = doc.pages.filter((p) => p.text.trim().length > 0);
  if (!readable.length || doc.pages.length !== doc.pageCount) throw new Error("The local page extraction is incomplete; finish ingestion first.");
  Object.assign(report, { documentId, domainId, model: models.analysis, totalPages: doc.pages.length,
    readablePages: readable.length, unreadablePages: doc.pages.filter((p) => !p.text.trim()).map((p) => p.page),
    limitation: "Tests real indexing, retrieval and structured extraction for one domain. It does not certify exhaustive claim extraction or OCR coverage." });
  await save();

  const client = new OpenAI({ apiKey: key, maxRetries: 1, timeout: 180_000 });
  await client.models.retrieve(models.analysis);
  const ai = new RealGateway(client); // Deliberately bypass OPENAI_FAKE for this explicit live test.
  const files: string[] = [];
  let storeId: string | undefined;
  try {
    storeId = await ai.createVectorStore(`policy-tracker-live-test-${documentId}`, { purpose: "temporary-live-test" });
    report.temporaryStoreId = storeId;
    report.temporaryFileIds = files;
    await save();
    const attached: Array<{ fileId: string; attributes: { document_id: string; page: number } }> = [];
    for (let start = 0; start < readable.length; start += 2) {
      const uploads = await Promise.allSettled(readable.slice(start, start + 2).map(async (p) => {
        const fileId = await ai.uploadFile(pageFileName(doc.id, p.page), Buffer.from(pageFileText(doc, p.page, doc.pages.length, p.text)), "assistants");
        files.push(fileId);
        attached.push({ fileId, attributes: { document_id: doc.id, page: p.page } });
      }));
      report.uploadedPages = files.length;
      await save();
      const failed = uploads.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      if (start % 20 === 0) console.log(`Live test: uploaded ${files.length}/${readable.length} readable pages`);
    }
    await ai.attachFiles(storeId, attached);
    const deadline = Date.now() + 180_000;
    let retriedIndexing = false;
    let completed = new Set<string>();
    for (;;) {
      const indexed = await ai.listStoreFiles(storeId);
      completed = new Set(indexed.filter((f) => f.status === "completed").map((f) => f.id));
      report.indexing = indexed;
      report.indexedPages = completed.size;
      await save();
      if (files.every((id) => completed.has(id))) break;
      const pending = indexed.some((f) => f.status === "in_progress");
      if (!pending && !retriedIndexing) {
        const failed = attached.filter((f) => !completed.has(f.fileId));
        console.log(`Live test: ${completed.size}/${files.length} pages indexed; retrying ${failed.length} failed or missing page files`);
        for (const file of failed) {
          if (indexed.some((f) => f.id === file.fileId)) await ai.detachFile(storeId, file.fileId);
        }
        retriedIndexing = true;
        await ai.attachFiles(storeId, failed);
        continue;
      }
      if (!pending || Date.now() >= deadline) {
        const errors = indexed.filter((f) => f.status !== "completed").map((f) => `${f.status}: ${f.error ?? "no detail"}`);
        throw new Error(`Only ${completed.size}/${files.length} pages indexed. The test will not analyze a partial index. ${[...new Set(errors)].join("; ")}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    report.indexedPages = completed.size;
    console.log(`Live test: all ${readable.length} readable pages indexed; requesting ${domainId} with ${models.analysis}`);
    const call = await callStructured(documentRequest({ ...doc, country: { vectorStoreId: storeId } }, domain, tax, models.analysis), ai);
    const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
    const quotes = citationLists<DocCitation>(call.output).flatMap((list) => list.citations).map((c) => {
      const page = doc.pages.find((p) => p.page === c.page);
      return { ...c, exactSourceMatch: Boolean(page && normalize(c.quote) && normalize(page.text).includes(normalize(c.quote))) };
    });
    Object.assign(report, { status: "passed_api", responseId: call.responseId, usage: call.usage,
      estimatedInferenceAndSearchCostUsd: call.costUsd, costNote: "Estimate excludes storage and any provider cache-write or regional adjustments.",
      searchCalls: call.fileSearchCalls, queries: call.queries,
      pagesReturned: [...new Set(call.retrieved.map((r) => r.attributes.page).filter((p) => typeof p === "number"))].sort((a, b) => Number(a) - Number(b)),
      quoteChecks: quotes, output: call.output });
    await save();
    console.log(JSON.stringify({ status: report.status, responseId: call.responseId, model: models.analysis, indexedPages: completed.size, findings: call.output.findings.length, exactQuotes: quotes.filter((q) => q.exactSourceMatch).length, quotes: quotes.length, estimatedCostUsd: call.costUsd }));
  } finally {
    const cleanupErrors: string[] = [];
    if (storeId) try { await ai.deleteVectorStore(storeId); } catch (err) { cleanupErrors.push(`store ${storeId}: ${safeError(err)}`); }
    for (const fileId of files) try { await ai.deleteFile(fileId); } catch (err) { cleanupErrors.push(`file ${fileId}: ${safeError(err)}`); }
    report.cleanup = { complete: cleanupErrors.length === 0, errors: cleanupErrors };
    await save();
  }
}

main().catch(async (err) => {
  if (report.status !== "blocked_missing_api_key") report.status = "failed";
  report.error = safeError(err);
  await save();
  console.error(report.error);
  process.exitCode = 1;
}).finally(async () => {
  report.finishedAt = new Date().toISOString();
  await save();
  await db.$disconnect();
});
