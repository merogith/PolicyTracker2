import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import type { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { storedSchemaFor } from "../src/lib/analysis/schemas";
import { verifyQuote } from "../src/lib/analysis/verify";
import { readClassification } from "../src/lib/labels";
import { validateClassification } from "../src/lib/analysis/labels";
import { enqueue } from "../src/lib/jobs";

/** Preserve audited, still-valid findings omitted by a nondeterministic rerun. */
async function main() {
  const before = JSON.parse(readFileSync("output/belarus-audit/snapshot.json", "utf8")) as {
    results: Array<{ id: string; documentId: string; domainId: string; output: unknown }>;
  };
  const report = [];
  for (const [documentId, index] of [["BEL-NDC1", 2], ["BEL-NDC2", 2], ["BEL-NDC2", 7]] as const) {
    const old = before.results.find(r => r.documentId === documentId && r.domainId === "energy")!;
    type Parsed = ReturnType<ReturnType<typeof storedSchemaFor>["parse"]>;
    storedSchemaFor("document").parse(old.output);
    const finding = (old.output as { findings: Parsed["findings"] }).findings[index];
    const result = await db.analysisResult.findUniqueOrThrow({ where: { id: old.id } });
    const output = storedSchemaFor("document").parse(result.output);
    if (output.findings.some(f => f.text === finding.text)) continue;
    const pages = new Map((await db.page.findMany({ where: { documentId } })).map(p => [p.page, p]));
    const quotes = finding.citations.map(c => {
      if (!("quote" in c)) throw new Error("Expected a document quotation");
      const checked = verifyQuote(c.quote, c.page, pages);
      if (!checked.verified) throw new Error("Refusing to restore an unverified quotation");
      return { ...c, actualPage: checked.page };
    });
    const classification = readClassification(finding);
    if (!classification) throw new Error("Classification missing");
    validateClassification(classification, quotes.map(c => c.quote));
    const path = `findings.${output.findings.length}`;
    const source = (result.sources ?? {}) as Prisma.JsonObject;
    const updated = { ...(result.output as Prisma.JsonObject), findings: [...(result.output as { findings: typeof output.findings }).findings, finding] };
    await db.$transaction(async tx => {
      const current = await tx.analysisResult.findUniqueOrThrow({ where: { id: result.id } });
      if (!isDeepStrictEqual(current.output, result.output)) throw new Error("Answer changed concurrently");
      await tx.analysisResult.update({ where: { id: result.id }, data: {
        output: updated as Prisma.InputJsonValue,
        sources: { ...source, preservedBeforeRerun: [...((source.preservedBeforeRerun ?? []) as Prisma.JsonArray), { originalIndex: index, restoredPath: path }],
          labeling: { ...(source.labeling as Prisma.JsonObject), total: updated.findings.length, classified: updated.findings.length } } as Prisma.InputJsonValue,
        finishedAt: new Date(),
      } });
      await tx.citation.createMany({ data: quotes.map((c, position) => ({
        resultId: result.id, documentId, page: c.actualPage, citedPage: c.page,
        quote: c.quote, verified: true, itemPath: path, position,
      })) });
    });
    report.push({ documentId, originalIndex: index, restoredPath: path, text: finding.text });
  }
  const country = await db.country.findUniqueOrThrow({ where: { iso3: "BEL" } });
  const pending = await db.job.findFirst({ where: { countryId: country.id, domainId: "energy", type: "synthesise_country_domain", status: "queued" } });
  const summary = pending ?? await enqueue("synthesise_country_domain", { countryId: country.id, domainId: "energy" }, { runAfter: new Date(Date.now() + 10000) });
  writeFileSync("output/belarus-repair/preserved-findings.json", JSON.stringify({ restored: report, summaryJob: summary.id }, null, 2));
  console.log(JSON.stringify({ restored: report, summaryJob: summary.id }, null, 2));
}
main().catch(e => { console.error(String(e)); process.exitCode = 1; }).finally(() => db.$disconnect());
