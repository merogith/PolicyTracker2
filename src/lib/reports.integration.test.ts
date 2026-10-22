import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";

test("saved reports survive working edits, preserve score/claim identity, and switch main without rewriting history", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "policy-reports-"));
  const database = path.join(directory, "test.db");
  process.env.DATABASE_URL = `file:${database.replaceAll("\\", "/")}`;
  process.env.STORAGE_DIR = directory;
  const sql = new Database(database);
  for (const name of readdirSync("prisma/migrations").filter(n => /^\d/.test(n)).sort()) sql.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
  sql.close();
  const { db } = await import("./db");
  const { saveCountryReport, setMainReport } = await import("./reports");
  const { readReport, reportDocument } = await import("./report-reader");
  const { countryTopics } = await import("./topics");
  const { countryOverview } = await import("./overview");
  const { buildDocumentationDashboard } = await import("./documentation-score");
  const { claimScore } = await import("./claim-score");
  const { pruneReportSources } = await import("./report-files");
  const { PROMPT_VERSION } = await import("./analysis/prompt");
  try {
    const country = await db.country.create({ data: { iso3: "TST", name: "Test country", docCounters: {} } });
    await db.domain.create({ data: { id: "climate", prefix: "CLI", label: "Climate", definition: "Climate", groups: [], searchHints: [], order: 1 } });
    await db.topic.create({ data: { id: "CLI-01", label: "Topic", definition: "Topic", placements: [{ domain: "climate", group: "" }], routing: [], legacyIds: [], splitFrom: [], order: 1 } });
    await db.taxonomyState.create({ data: { baseVersion: "test" } });
    const bytes = Buffer.from("%PDF-1.4\nTest source\n");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    mkdirSync(path.join(directory, "TST"));
    writeFileSync(path.join(directory, "TST", "TST-NDC1.pdf"), bytes);
    const doc = await db.document.create({ data: { id: "TST-NDC1", countryId: country.id, title: "Source", kind: "NDC", kindSeq: 1, editionDate: "2026-01-01", pdfPath: "TST/TST-NDC1.pdf", originalName: "source.pdf", sha256, status: "analysed", pageCount: 1 } });
    const quote = "The plan will reduce emissions by 20 percent.";
    await db.page.create({ data: { documentId: doc.id, page: 1, text: quote, disposition: "extracted" } });
    const finding = { text: "The plan will reduce emissions.", kind: "target", topic_ids: ["CLI-01"], unmapped_concepts: [], figures: [], citations: [{ page: 1, quote }] };
    const source = await db.analysisResult.create({ data: { countryId: country.id, documentId: doc.id, domainId: "climate", domainVersion: 1, slot: `doc:${doc.id}`, scope: "document", status: "done", promptVersion: PROMPT_VERSION, taxonomyVersion: "test", output: { findings: [finding], not_found: false }, sources: { mode: "live" },
      citations: { create: { documentId: doc.id, page: 1, citedPage: 1, quote, verified: true, itemPath: "findings.0", position: 0 } } } });
    await db.analysisResult.create({ data: { countryId: country.id, domainId: "climate", domainVersion: 1, slot: `country:${country.id}`, scope: "country", status: "done", promptVersion: PROMPT_VERSION, taxonomyVersion: "test",
      output: { findings: [{ ...finding, citations: [{ ref: `${doc.id}#findings.0` }] }], not_found: false },
      sources: { mode: "live", itemRefs: { "findings.0": [{ resultId: source.id, path: "findings.0" }] } },
      citations: { create: { documentId: doc.id, page: 1, citedPage: 1, quote, verified: true, itemPath: "findings.0", position: 0 } } } });
    const first = await saveCountryReport(country.id, "Original");
    assert.ok(first);
    assert.equal((await saveCountryReport(country.id))?.id, first.id, "Unchanged results do not create duplicate reports");
    const originalPayload = JSON.stringify(first.snapshot);
    assert.equal((await countryTopics(country.id)).mergedCount, 1);
    const original = (await readReport(country.id))!;
    assert.equal(original.data.topics.topicItems("CLI-01")[0], original.data.topics.topics[0].items[0], "Graph identity survives serialization");
    assert.equal(original.data.topics.docDomains[0].perDomain.get("climate"), 1);
    assert.ok(original.data.cards[0].result?.createdAt instanceof Date);
    assert.equal(reportDocument(original.data, doc.id)?.pages[0].text, quote);
    const savedClaim = original.data.topics.topics[0].items[0];
    const frozenScore = claimScore(savedClaim.units);
    savedClaim.units.forEach(unit => { unit.kind = "delivered"; });
    assert.deepEqual(claimScore(savedClaim.units), frozenScore, "Historical claim scores use their saved calculation");
    await db.analysisResult.update({ where: { id: source.id }, data: { output: { findings: [finding, { ...finding, text: "A separate commitment." }], not_found: false } } });
    const second = await saveCountryReport(country.id, "Repaired");
    assert.ok(second); assert.notEqual(second.id, first.id);
    assert.equal((await countryTopics(country.id)).mergedCount, 1, "Creating a report does not switch the main one");
    await setMainReport(country.id, second.id);
    assert.equal((await countryTopics(country.id)).mergedCount, 2);
    await setMainReport(country.id, first.id);
    assert.equal((await countryTopics(country.id)).mergedCount, 1);
    const dashboard = buildDocumentationDashboard(await countryTopics(country.id), await countryOverview(country.id));
    assert.equal(dashboard.country.findings, 1);
    const other = await db.country.create({ data: { iso3: "OTH", name: "Other", docCounters: {} } });
    await assert.rejects(setMainReport(other.id, first.id), /Report not found/);
    const { default: CountryPage } = await import("../app/countries/[iso3]/page");
    const { default: DocumentPage } = await import("../app/countries/[iso3]/documents/[id]/page");
    for (const link of [{ iso3: country.iso3, report: "missing-report" }, { iso3: other.iso3, report: first.id }]) {
      const searchParams = Promise.resolve({ report: link.report });
      await assert.rejects(
        CountryPage({ params: Promise.resolve({ iso3: link.iso3 }), searchParams }),
        { digest: "NEXT_HTTP_ERROR_FALLBACK;404" },
        "Missing and wrong-country report links must show not found",
      );
      await assert.rejects(
        DocumentPage({ params: Promise.resolve({ iso3: link.iso3, id: doc.id }), searchParams }),
        { digest: "NEXT_HTTP_ERROR_FALLBACK;404" },
        "Evidence links must not crash or fall back to a different report",
      );
    }
    // Prisma's SQLite adapter maps trigger ABORT to a generic constraint error.
    await assert.rejects(db.countryReport.update({ where: { id: first.id }, data: { title: "Mutated" } }));
    const guard = new Database(database);
    try { assert.throws(() => guard.prepare("UPDATE CountryReport SET title = 'Mutated' WHERE id = ?").run(first.id), /immutable/); }
    finally { guard.close(); }
    await db.analysisResult.update({ where: { id: source.id }, data: { status: "failed" } });
    assert.equal(await saveCountryReport(country.id), null, "Incomplete work cannot become a completed report");
    assert.equal((await countryTopics(country.id)).mergedCount, 1, "Failed reruns keep the main report visible");
    await db.document.delete({ where: { id: doc.id } });
    assert.equal((await countryTopics(country.id)).mergedCount, 1, "Removing working evidence does not erase historical claims");
    assert.deepEqual(readFileSync(path.join(directory, "report-sources", `${sha256}.pdf`)), bytes);
    assert.equal(JSON.stringify((await db.countryReport.findUniqueOrThrow({ where: { id: first.id } })).snapshot), originalPayload);
    await pruneReportSources([sha256]);
    assert.deepEqual(readFileSync(path.join(directory, "report-sources", `${sha256}.pdf`)), bytes, "A saved report protects its PDF");
    await db.country.delete({ where: { id: country.id } });
    await pruneReportSources([sha256]);
    assert.throws(() => readFileSync(path.join(directory, "report-sources", `${sha256}.pdf`)), /ENOENT/);
  } finally {
    await db.$disconnect();
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(directory).startsWith("policy-reports-"));
    rmSync(directory, { recursive: true, force: true });
  }
});
