import "dotenv/config";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { verifyQuote } from "../src/lib/analysis/verify";
import { validateClassification } from "../src/lib/analysis/labels";
import { readClassification } from "../src/lib/labels";
import { readReport } from "../src/lib/report-reader";
import { storedSchemaFor } from "../src/lib/analysis/schemas";
import { currentCountryTopics, countryTopics } from "../src/lib/topics";
import { buildDocumentationDashboard } from "../src/lib/documentation-score";
import { countryOverview } from "../src/lib/overview";

type Json = Record<string, unknown>;
async function main() {
  const before = new Database("output/report-history-repair/before.db", { readonly: true });
  const old = new Map((before.prepare("SELECT id, output FROM AnalysisResult").all() as Array<{ id: string; output: string }>).map(r => [r.id, JSON.parse(r.output)]));
  before.close();
  const summary = [];
  for (const country of await db.country.findMany({ where: { status: "active" } })) {
    const results = await db.analysisResult.findMany({ where: { countryId: country.id }, include: { citations: true } });
    const sourceResults = results.filter(r => r.scope === "document" && r.status === "done");
    const pages = await db.page.findMany({ where: { document: { countryId: country.id } } });
    let findings = 0, quotes = 0, missingLabels = 0, badLabels = 0, badQuotes = 0, missingRefs = 0, unchanged = 0;
    for (const result of results) {
      assert.ok(storedSchemaFor(result.scope as "document" | "country").safeParse(result.output).success, `Schema ${result.id}`);
      if (JSON.stringify(old.get(result.id)) === JSON.stringify(result.output)) unchanged++;
      if (result.scope !== "document") continue;
      const output = result.output as Json;
      const rows = output.findings as Json[];
      findings += rows.length;
      // Repairs may move an unsupported absence to notes; supported assertion text stays identical.
      const previous = old.get(result.id).findings as Json[];
      for (const row of rows) assert.ok(previous.some(f => f.text === row.text), "Repair must not introduce or rewrite assertions");
      const pageMap = new Map(pages.filter(p => p.documentId === result.documentId).map(p => [p.page, p]));
      for (const cite of result.citations) {
        quotes++;
        if (!cite.verified || !verifyQuote(cite.quote, cite.citedPage, pageMap).verified) badQuotes++;
      }
      rows.forEach((finding, i) => {
        const evidence = result.citations.filter(c => c.itemPath === `findings.${i}` && c.verified);
        assert.ok(evidence.length, `No evidence ${result.id}#${i}`);
        const classification = readClassification(finding);
        if (!classification) missingLabels++;
        else try { validateClassification(classification, evidence.map(c => c.quote)); } catch { badLabels++; }
      });
      const countryResult = results.find(r => r.scope === "country" && r.domainId === result.domainId && r.domainVersion === result.domainVersion);
      const refs = Object.values(((countryResult?.sources as Json)?.itemRefs ?? {}) as Record<string, Array<{ resultId: string; path: string }>>).flat();
      rows.forEach((_, i) => { if (!refs.some(ref => ref.resultId === result.id && ref.path === `findings.${i}`)) missingRefs++; });
    }
    for (const result of results.filter(r => r.scope === "country")) {
      const refs = Object.values(((result.sources as Json)?.itemRefs ?? {}) as Record<string, Array<{ resultId: string; path: string }>>).flat();
      for (const ref of refs) {
        const source = sourceResults.find(r => r.id === ref.resultId);
        assert.ok(source && ((source.output as Json).findings as Json[])[Number(ref.path.split(".")[1])], "Unresolved summary ref");
      }
    }
    assert.equal(badQuotes + missingLabels + badLabels + missingRefs, 0, `${country.iso3} remaining issues`);
    const report = await readReport(country.id); assert.ok(report);
    const topics = await countryTopics(country.id), current = await currentCountryTopics(country.id);
    assert.equal(topics.mergedCount, current.mergedCount);
    const dashboard = buildDocumentationDashboard(topics, await countryOverview(country.id));
    summary.push({ country: country.iso3, findings, quotes, badQuotes, missingLabels, badLabels, missingRefs,
      unchangedOutputs: unchanged, totalOutputs: results.length, savedReports: await db.countryReport.count({ where: { countryId: country.id } }),
      mainReport: report.id, claims: dashboard.country.findings, points: dashboard.country.claimScore.value });
  }
  writeFileSync("output/report-history-repair/verification.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
