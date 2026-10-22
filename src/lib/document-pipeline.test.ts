import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, beforeEach, mock, test } from "node:test";
import Database from "better-sqlite3";
import { PDFDocument } from "pdf-lib";
import { db } from "./db";
import { claimNext, Defer, enqueue } from "./jobs";
import { createDocument } from "./documents";
import { estimateDocument } from "./cost";
import { openai } from "./openai";
import { synthesiseCountryDomain } from "./analysis/synthesise";
import { storedSchemaFor } from "./analysis/schemas";
import { PROMPT_VERSION } from "./analysis/prompt";
import { handlers } from "../worker/handlers";
import { countryTopics } from "./topics";
import { countryOverview } from "./overview";
import { claimScore } from "./claim-score";

const directory = mkdtempSync(path.join(tmpdir(), "policy-pipeline-"));
const previousEnv = { ...process.env };

before(async () => {
  const databasePath = path.join(directory, "test.db");
  process.env.DATABASE_URL = `file:${databasePath.replaceAll("\\", "/")}`;
  process.env.STORAGE_DIR = path.join(directory, "storage");
  process.env.OPENAI_FAKE = "1";
  process.env.MAX_USD_PER_RUN = "0";
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.OPENAI_MODEL_CHEAP;
  const sqlite = new Database(databasePath);
  const migrations = path.resolve("prisma/migrations");
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    sqlite.exec(readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  sqlite.close();
  await db.domain.create({ data: { id: "water", prefix: "WAT", label: "Water", definition: "Water policy", groups: [], searchHints: [], order: 0 } });
  await db.topic.create({ data: { id: "WAT-01", label: "Water", definition: "Water policy", placements: [{ domain: "water", group: "water" }], routing: [], legacyIds: [], splitFrom: [], order: 0 } });
});

beforeEach(async () => {
  mock.restoreAll();
  await db.job.deleteMany();
  await db.country.deleteMany();
});

after(async () => {
  mock.restoreAll();
  await db.$disconnect();
  process.env = previousEnv;
  rmSync(directory, { recursive: true, force: true });
});

async function country(iso3 = "AAA") {
  return db.country.create({ data: { iso3, name: iso3, docCounters: {} } });
}

async function document(countryId: string, id: string, order = 1) {
  return db.document.create({
    data: {
      id, countryId, kind: "NDC", kindSeq: order, title: id, editionDate: "2025-01-01",
      pdfPath: `${id}.pdf`, originalName: `${id}.pdf`, sha256: id, status: "analysed",
      createdAt: new Date(2025, 0, order),
    },
  });
}

const finding = {
  title: "Improve water access",
  summary: "The plan commits to improved water access.",
  text: "Improve water access by 2030.",
  kind: "commitment",
  figures: [{ label: "Target year", value_as_stated: "2030", value: "2030", unit: null, period: "2030", conditionality: "not_stated" }],
  topic_ids: ["WAT-01"],
  unmapped_concepts: [],
  citations: [{ page: 3, quote: "Improve water access by 2030." }],
};

async function answer(countryId: string, documentId: string, mode = "live") {
  return db.analysisResult.create({
    data: {
      countryId, documentId, domainId: "water", domainVersion: 1, scope: "document",
      slot: `doc:${documentId}`, status: "done", promptVersion: PROMPT_VERSION, taxonomyVersion: "unseeded",
      output: { findings: [finding], not_found: false, note: null, citations: [] },
      sources: { mode }, inputTokens: 500, outputTokens: 100, costUsd: 1,
      citations: { create: { documentId, itemPath: "findings.0", position: 0, page: 2, citedPage: 3, quote: finding.text, verified: true } },
    },
  });
}

test("worker loops finish one document before starting the next, including delayed retries", async () => {
  const a = await country();
  const b = await country("BBB");
  await document(a.id, "AAA-NDC1");
  await document(a.id, "AAA-NDC2", 2);
  await document(b.id, "BBB-NDC1");
  await enqueue("ingest_document", { documentId: "AAA-NDC1" }, { countryId: a.id });
  await enqueue("ingest_document", { documentId: "AAA-NDC2" }, { countryId: a.id });
  await enqueue("ingest_document", { documentId: "BBB-NDC1" }, { countryId: b.id });
  const claimed = (await Promise.all([claimNext(), claimNext(), claimNext()])).filter((job) => job !== null);
  assert.deepEqual(claimed.map((job) => job.documentId).sort(), ["AAA-NDC1", "BBB-NDC1"]);
  await db.$transaction(async (tx) => {
    await enqueue("analyse_document_domain", { documentId: "AAA-NDC1", domainId: "water" }, { countryId: a.id, tx });
    await enqueue("analyse_document_domain", { documentId: "AAA-NDC1", domainId: "energy" }, { countryId: a.id, tx });
    await tx.job.updateMany({ where: { status: "running" }, data: { status: "done" } });
  });
  const questions = await Promise.all([claimNext(), claimNext()]);
  assert.ok(questions.every((job) => job?.documentId === "AAA-NDC1" && job.type === "analyse_document_domain"));
  assert.equal(await claimNext(), null);
  await db.job.update({ where: { id: questions[0]!.id }, data: { status: "queued", runAfter: new Date(Date.now() + 60_000) } });
  await db.job.update({ where: { id: questions[1]!.id }, data: { status: "done" } });
  assert.equal(await claimNext(), null, "a delayed retry keeps the first document's place");
  await db.job.update({ where: { id: questions[0]!.id }, data: { status: "failed" } });
  assert.equal((await claimNext())?.documentId, "AAA-NDC2", "a terminal failure releases the next document");
});

test("filtered workers respect another stage, and cancellation releases the next document", async () => {
  const c = await country();
  await document(c.id, "AAA-NDC1");
  await document(c.id, "AAA-NDC2", 2);
  const first = await enqueue("analyse_document_domain", { documentId: "AAA-NDC1", domainId: "water" }, { countryId: c.id });
  await enqueue("ingest_document", { documentId: "AAA-NDC2" }, { countryId: c.id });
  assert.equal(await claimNext(["ingest_document"]), null);
  await db.job.update({ where: { id: first.id }, data: { status: "cancelled" } });
  assert.equal((await claimNext(["ingest_document"]))?.documentId, "AAA-NDC2");
});

test("single-document overview preserves evidence, topics and demo labels without an LLM call", async () => {
  const c = await country();
  await document(c.id, "AAA-NDC1");
  const source = await answer(c.id, "AAA-NDC1", "demo");
  const call = mock.method(openai(), "structured", async () => { throw new Error("Unexpected LLM call"); });
  const out = await synthesiseCountryDomain(c.id, "water");
  assert.equal(out.reusedDocument, true);
  assert.equal(call.mock.callCount(), 0);
  const result = await db.analysisResult.findFirstOrThrow({ where: { scope: "country" }, include: { citations: true } });
  assert.ok(storedSchemaFor("country").safeParse(result.output).success);
  assert.deepEqual([result.inputTokens, result.outputTokens, result.costUsd, result.fileSearchCalls], [0, 0, 0, 0]);
  assert.equal(result.model, null);
  const sources = result.sources as { mode: string; itemRefs: unknown };
  assert.equal(sources.mode, "demo");
  assert.deepEqual(sources.itemRefs, { "findings.0": [{ resultId: source.id, path: "findings.0" }] });
  assert.deepEqual(result.citations.map((c) => [c.page, c.citedPage, c.quote, c.verified]), [[2, 3, finding.text, true]]);
  assert.equal((await countryTopics(c.id)).topicCounts("WAT-01").total, 1);
  const overview = await countryOverview(c.id);
  assert.equal(overview.summariesDone, 1);
  assert.equal(overview.figures[0].valueAsStated, "2030");
  await synthesiseCountryDomain(c.id, "water");
  assert.equal(await db.citation.count({ where: { resultId: result.id } }), 1, "retries replace citations");
  await db.analysisResult.update({ where: { id: source.id }, data: { output: { findings: [], not_found: true, note: "No evidence found", citations: [] } } });
  await db.citation.deleteMany({ where: { resultId: source.id } });
  await synthesiseCountryDomain(c.id, "water");
  const empty = await db.analysisResult.findUniqueOrThrow({ where: { id: result.id }, include: { citations: true } });
  assert.equal((empty.output as { not_found: boolean }).not_found, true);
  assert.equal(empty.citations.length, 0);
  assert.equal(call.mock.callCount(), 0);
});

test("multiple documents still use synthesis after all domains finish; deleting down to one reuses it", async () => {
  process.env.OPENAI_MODEL = "gpt-6-luna";
  const c = await country();
  await document(c.id, "AAA-NDC1");
  await document(c.id, "AAA-NDC2", 2);
  await answer(c.id, "AAA-NDC1");
  await answer(c.id, "AAA-NDC2");
  const call = mock.method(openai(), "structured", async () => ({
    responseId: "test-response", refusal: null, incomplete: null,
    outputText: JSON.stringify({
      findings: [{ ...finding, citations: [{ ref: "AAA-NDC1#findings.0" }, { ref: "AAA-NDC2#findings.0" }] }],
      not_found: false, note: null, citations: [], by_document: [], changes_between_editions: [],
    }),
    usage: { inputTokens: 100, cachedTokens: 0, outputTokens: 50, reasoningTokens: 0 },
    fileSearchCalls: 0, queries: [], retrieved: [],
  }));
  const pending = await enqueue("analyse_document_domain", { documentId: "AAA-NDC2", domainId: "energy" }, { countryId: c.id });
  await assert.rejects(handlers.synthesise_country_domain({ countryId: c.id, domainId: "water" }), Defer);
  assert.equal(call.mock.callCount(), 0);
  await db.job.update({ where: { id: pending.id }, data: { status: "done" } });
  await handlers.synthesise_country_domain({ countryId: c.id, domainId: "water" });
  assert.equal(call.mock.callCount(), 1);
  const combined = await db.analysisResult.findFirstOrThrow({ where: { scope: "country" }, include: { citations: true } });
  assert.equal(combined.citations.length, 2);
  assert.equal(combined.costUsd, 0, "Simulated synthesis never incurs API cost");
  const sourceTopics=await countryTopics(c.id);
  assert.equal(sourceTopics.topicItems("WAT-01").length,1); // Exact source restatements, not two document counts.
  assert.equal(sourceTopics.topicItems("WAT-01")[0].units.length,2);
  assert.equal(claimScore(sourceTopics.topicItems("WAT-01")[0].units).points,1);
  // A narrative summary must not overwrite the source assertion's statement type or text.
  await db.analysisResult.update({where:{id:combined.id},data:{output:{findings:[{...finding,text:"Narrative combines several different claims",kind:"delivered"}],not_found:false,note:null,citations:[]}}});
  const independent=await countryTopics(c.id);
  assert.equal(independent.topicItems("WAT-01")[0].units[0].text,finding.text);
  assert.equal(claimScore(independent.topicItems("WAT-01")[0].units).points,1);
  await db.document.delete({ where: { id: "AAA-NDC2" } });
  await handlers.synthesise_country_domain({ countryId: c.id, domainId: "water" });
  assert.equal(call.mock.callCount(), 1);
  const single = await db.analysisResult.findUniqueOrThrow({ where: { id: combined.id }, include: { citations: true } });
  assert.equal(single.costUsd, 0);
  assert.equal(single.inputTokens, 0);
  assert.equal(single.citations.length, 1);
});

test("uploads keep per-document metadata, independent jobs and the single-document estimate", async () => {
  const c = await country();
  async function pdf(title: string) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.addPage().drawText(title);
    return Buffer.from(await pdf.save());
  }
  const data = await pdf("First");
  const first = await createDocument({ iso3: c.iso3, title: "First plan", kind: "NDC", editionDate: "2024-01-01", originalName: "first.pdf", data });
  const second = await createDocument({ iso3: c.iso3, title: "Second plan", kind: "NAP", editionDate: "2025-01-01", language: "fr", originalName: "second.pdf", data: await pdf("Second") });
  assert.equal(first.estimateUsd, estimateDocument(1).usd);
  assert.deepEqual([second.title, second.kind, second.editionDate, second.language], ["Second plan", "NAP", "2025-01-01", "fr"]);
  assert.equal(await db.job.count({ where: { type: "ingest_document" } }), 2);
  await assert.rejects(createDocument({ iso3: c.iso3, title: "Duplicate", kind: "NDC", editionDate: "2024-01-01", originalName: "first.pdf", data }), /already uploaded/);
  assert.equal(await db.document.count(), 2);
});
