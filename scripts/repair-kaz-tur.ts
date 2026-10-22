import "dotenv/config";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { models, openai } from "../src/lib/openai";
import { repairEvidence } from "../src/lib/analysis/repair-evidence";
import { classifyFindings } from "../src/lib/analysis/classify";
import { validateLabelBatch } from "../src/lib/analysis/labels";
import { citationLists, type DocCitation } from "../src/lib/analysis/schemas";
import { verifyQuote } from "../src/lib/analysis/verify";
import { LABEL_VERSION, readClassification } from "../src/lib/labels";
import { saveCountryReport, setMainReport as selectMainReport } from "../src/lib/reports";
import { refreshDocumentStatus } from "../src/lib/documents";
import { checkCap } from "../src/lib/cost";

type Json = Record<string, unknown>;
type Finding = Json & { text: string; citations: DocCitation[] };
const directory = "output/report-history-repair";
const absenceSlots = new Set(["KAZ-NDC2:culture", "TUR-NDC4:industry"]);
const json = (value: unknown) => value as Prisma.InputJsonValue;

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && openai().fake) throw new Error("Repairs require the configured live model.");
  const cap = checkCap(1); if (apply && cap) throw new Error(cap);
  mkdirSync(directory, { recursive: true });
  const countries = await db.country.findMany({ where: { iso3: { in: ["KAZ", "TUR"] } } });
  const changes: Json[] = [];
  const pathRemaps = new Map<string, Map<string, string>>();
  const affected = new Set<string>();
  for (const country of countries) {
    if (apply) assert.ok(await db.countryReport.count({ where: { countryId: country.id } }) || await saveCountryReport(country.id), `Preserve ${country.iso3} first`);
    const results = await db.analysisResult.findMany({ where: { countryId: country.id, scope: "document", status: "done" }, include: { citations: true }, orderBy: [{ documentId: "asc" }, { domainId: "asc" }] });
    for (const result of results) {
      const pages = new Map((await db.page.findMany({ where: { documentId: result.documentId! } })).map(page => [page.page, page]));
      const original = structuredClone(result.output) as Json;
      const output = structuredClone(original);
      const findings = (output.findings ?? []) as Finding[];
      const remove = findings.flatMap((f, i) => !f.citations?.length && absenceSlots.has(`${result.documentId}:${result.domainId}`) ? [i] : []);
      const invalid = findings.flatMap((f, i) => !remove.includes(i) && f.citations.some(c => !verifyQuote(c.quote, c.page, pages).verified) ? [i] : []);
      const missing = findings.flatMap((f, i) => !remove.includes(i) && !readClassification(f) ? [i] : []);
      if (!invalid.length && !missing.length && !remove.length) continue;
      const entry: Json = { country: country.iso3, document: result.documentId, domain: result.domainId, invalid, missing, removedAbsence: remove };
      changes.push(entry);
      console.log(JSON.stringify(entry));
      if (!apply) continue;
      writeFileSync(`${directory}/${result.documentId}-${result.domainId}-before.json`, JSON.stringify(result, null, 2));
      const repair = await repairEvidence(invalid.map(i => findings[i]), pages, models.analysis, `${result.documentId}:${result.domainId}:targeted-repair`);
      assert.equal(Object.keys(repair.unresolved).length, 0, JSON.stringify(repair.unresolved));
      const labelInputs = findings.flatMap((f, i) => {
        if (remove.includes(i)) return [];
        assert.ok(f.citations.length && f.citations.every(c => verifyQuote(c.quote, c.page, pages).verified), `Unverified ${result.id}#${i}`);
        const input = { id: `findings.${i}`, text: f.text, quotes: f.citations.map(c => c.quote) };
        const classification = readClassification(f);
        if (classification) {
          try { validateLabelBatch([input], [{ id: input.id, classification }]); return []; } catch { /* Reclassify only a label invalidated by quote repair. */ }
        }
        return [input];
      });
      const labels = await classifyFindings(labelInputs, models.synthesis, `${result.documentId}:${result.domainId}:targeted-repair`);
      assert.equal(Object.keys(labels.errors).length, 0, JSON.stringify(labels.errors));
      for (const [id, classification] of labels.classifications) {
        const f = findings[Number(id.split(".")[1])];
        f.classification = classification;
        f.classification_version = LABEL_VERSION;
        delete f.classification_error;
      }
      const remap = new Map<string, string>();
      const retained = findings.filter((_, i) => !remove.includes(i));
      findings.forEach((f, i) => { if (!remove.includes(i)) remap.set(`findings.${i}`, `findings.${retained.indexOf(f)}`); });
      pathRemaps.set(result.id, remap);
      output.findings = retained;
      output.not_found = retained.length === 0;
      if (remove.length) output.note = [output.note, ...remove.map(i => `Search note (not a policy claim): ${findings[i].text}`)].filter(Boolean).join("\n");
      // Top-level quotations are references to evidence, not extra findings.
      output.citations = retained.flatMap(f => f.citations);
      const rows: Prisma.CitationCreateManyInput[] = [];
      for (const list of citationLists<DocCitation>(output)) list.citations.forEach((c, position) => {
        const verdict = verifyQuote(c.quote, c.page, pages);
        assert.ok(verdict.verified);
        rows.push({ resultId: result.id, documentId: result.documentId!, page: verdict.page, citedPage: c.page, quote: c.quote, verified: true, itemPath: list.path, position });
      });
      const costUsd = labels.costUsd + repair.diagnostics.reduce((sum, call) => sum + (call.costUsd ?? 0), 0);
      await db.$transaction(async tx => {
        const updated = await tx.analysisResult.updateMany({ where: { id: result.id, updatedAt: result.updatedAt }, data: {
          output: json(output), costUsd: { increment: costUsd },
          sources: json({ ...(result.sources as Json), targetedRepair: { at: new Date(), invalid, classified: [...labels.classifications.keys()], removedAbsence: remove, costUsd },
            labeling: { status: "complete", total: retained.length, classified: retained.length } }),
        } });
        assert.equal(updated.count, 1, "Result changed during repair");
        await tx.citation.deleteMany({ where: { resultId: result.id } });
        await tx.citation.createMany({ data: rows });
      });
      affected.add(`${country.id}:${result.domainId}`);
      entry.costUsd = costUsd; entry.classified = labels.classifications.size;
      writeFileSync(`${directory}/${result.documentId}-${result.domainId}-after.json`, JSON.stringify(output, null, 2));
    }
  }
  if (apply) {
    // Rebuild citations and source mappings from retained findings, preserving narrative text.
    // Append any omitted source assertion verbatim rather than asking the model to extract again.
    for (const country of countries) {
      const summaries = await db.analysisResult.findMany({ where: { countryId: country.id, scope: "country", status: "done" } });
      for (const summary of summaries) {
        const sources = await db.analysisResult.findMany({ where: { countryId: country.id, scope: "document", domainId: summary.domainId, domainVersion: summary.domainVersion, status: "done" }, include: { citations: true } });
        const index = new Map<string, { finding: Finding; source: typeof sources[number]; path: string }>(sources.flatMap(source => ((source.output as Json).findings as Finding[]).map((finding, i) => [`${source.documentId}#findings.${i}`, { finding, source, path: `findings.${i}` }] as const)));
        const out = structuredClone(summary.output) as Json;
        const seen = new Set<string>();
        const rebuilt = ((out.findings ?? []) as Array<Json & { citations: Array<{ ref: string }> }>).flatMap(f => {
          const refs = f.citations.flatMap(({ ref }) => {
            const [doc, oldPath] = ref.split("#");
            const source = sources.find(s => s.documentId === doc);
            const remap = source ? pathRemaps.get(source.id) : undefined;
            const path = remap ? remap.get(oldPath) : oldPath;
            const resolved = path ? `${doc}#${path}` : "";
            if (!index.has(resolved)) return [];
            seen.add(resolved); return [{ ref: resolved }];
          });
          return refs.length ? [{ ...f, citations: refs }] : [];
        });
        const missing = [...index.keys()].filter(ref => !seen.has(ref));
        const originalCount = ((out.findings ?? []) as unknown[]).length;
        const repairedSinceSummary = sources.some(source => (source.sources as Json)?.targetedRepair && source.updatedAt > summary.updatedAt);
        if (!affected.has(`${country.id}:${summary.domainId}`) && !repairedSinceSummary && !missing.length && rebuilt.length === originalCount) continue;
        for (const ref of missing) {
          const { citations: _citations, ...finding } = index.get(ref)!.finding;
          void _citations;
          rebuilt.push({ ...finding, citations: [{ ref }] });
        }
        out.findings = rebuilt; out.not_found = rebuilt.length === 0;
        out.citations = [...index.keys()].map(ref => ({ ref }));
        const itemRefs: Record<string, Array<{ resultId: string; path: string }>> = {};
        const rows: Prisma.CitationCreateManyInput[] = [];
        for (const list of citationLists<{ ref: string }>(out)) {
          let position = 0;
          const refs = [];
          for (const { ref } of list.citations) {
            const source = index.get(ref); assert.ok(source, `Unresolved ${ref}`);
            refs.push({ resultId: source.source.id, path: source.path });
            for (const c of source.source.citations.filter(c => c.itemPath === source.path)) rows.push({
              resultId: summary.id, documentId: c.documentId, page: c.page, citedPage: c.citedPage, quote: c.quote, verified: c.verified, itemPath: list.path, position: position++,
            });
          }
          if (list.path) itemRefs[list.path] = refs;
        }
        await db.$transaction(async tx => {
          const updated = await tx.analysisResult.updateMany({ where: { id: summary.id, updatedAt: summary.updatedAt }, data: { output: json(out),
            sources: json({ ...(summary.sources as Json), itemRefs, unresolvedRefs: [], targetedRepair: { at: new Date(), method: "preserve_narrative_rebuild_references", appendedSourceRefs: missing } }) } });
          assert.equal(updated.count, 1);
          await tx.citation.deleteMany({ where: { resultId: summary.id } });
          await tx.citation.createMany({ data: rows });
        });
        changes.push({ country: country.iso3, summary: summary.domainId, appendedSourceRefs: missing });
        console.log(JSON.stringify(changes.at(-1)));
      }
      for (const doc of await db.document.findMany({ where: { countryId: country.id } })) await refreshDocumentStatus(doc.id);
      const report = await saveCountryReport(country.id, "Repaired quotations & labels");
      assert.ok(report, "Save repaired report");
      await selectMainReport(country.id, report.id);
      changes.push({ country: country.iso3, report: report.id, main: true });
    }
  }
  writeFileSync(`${directory}/${apply ? "repairs" : "repair-plan"}.json`, JSON.stringify(changes, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
