import "dotenv/config";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { models, openai } from "../src/lib/openai";
import { checkCap } from "../src/lib/cost";
import { costUsd } from "../src/lib/analysis/pricing";
import { callStructured } from "../src/lib/analysis/call";
import { PRESENTATION_VERSION, presentationRequest, validatePresentationBatch, withPresentation, type PresentationInput, type PresentationUpdate } from "../src/lib/analysis/presentation";

type Json = Record<string, unknown>;
type Finding = Json & { text: string; figures?: Json[] };
type Cached = { key: string; update: PresentationUpdate; costUsd: number; inputTokens: number; outputTokens: number; cachedTokens: number; reasoningTokens: number };
const directory = "output/claim-presentation";
const cachePath = `${directory}/cache.jsonl`;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  if (openai().fake) throw new Error("Saved claim titles require live mode; original findings will not be changed in demo mode.");
  const resultArg = process.argv.indexOf("--result");
  const results = await db.analysisResult.findMany({
    where: { status: "done", ...(resultArg > -1 ? { id: process.argv[resultArg + 1] } : {}) },
    include: { citations: true }, orderBy: { id: "asc" },
  });
  const cache = new Map<string, Cached>();
  if (existsSync(cachePath)) for (const line of readFileSync(cachePath, "utf8").split("\n").filter(Boolean)) {
    const entry = JSON.parse(line) as Cached;
    cache.set(entry.key, entry);
  }
  const inputs = new Map<string, PresentationInput>();
  const keys = new Map<string, string>();
  for (const result of results) {
    const findings = (result.output as Json | null)?.findings as Finding[] | undefined;
    for (const [i, finding] of (findings ?? []).entries()) {
      const input: PresentationInput = {
        id: `${result.id}#findings.${i}`, text: finding.text, kind: String(finding.kind ?? "other"),
        figures: (finding.figures ?? []).map(figure => { const copy = { ...figure }; delete copy.label; return copy; }),
        quotes: [...new Set(result.citations.filter(c => c.itemPath === `findings.${i}`).map(c => c.quote))],
      };
      const key = hash({ version: PRESENTATION_VERSION, model: models.synthesis, input });
      keys.set(input.id, key);
      inputs.set(input.id, input);
    }
  }
  const pending = [...inputs.values()].filter(input => !cache.has(keys.get(input.id)!));
  const batches: PresentationInput[][] = [];
  for (const input of pending) {
    let batch = batches.at(-1);
    if (!batch || batch.length >= 30 || JSON.stringify([...batch, input]).length > 50000) batches.push(batch = []);
    batch.push(input);
  }
  const estimate = costUsd(models.synthesis, { inputTokens: Math.ceil(JSON.stringify(pending).length / 3) + batches.length * 1000, cachedTokens: 0, outputTokens: pending.length * 450 });
  console.log(JSON.stringify({ results: results.length, findings: inputs.size, pending: pending.length, batches: batches.length, estimatedUsd: estimate, model: models.synthesis }));
  if (process.argv.includes("--dry-run")) return;
  const capError = checkCap(estimate);
  if (capError) throw new Error(capError);
  mkdirSync(directory, { recursive: true });
  let cursor = 0;
  let failures = 0;
  await Promise.all([0, 1].map(async () => {
    while (cursor < batches.length) {
      const batchIndex = cursor++;
      const batch = batches[batchIndex];
      const request = presentationRequest(batch, models.synthesis);
      let error = "";
      const spent = { costUsd: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 };
      let complete = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const call = await callStructured({ ...request, text: request.text + (error ? `\nCorrect this previous validation error: ${error}` : "") });
          spent.costUsd += call.costUsd;
          for (const key of ["inputTokens", "cachedTokens", "outputTokens", "reasoningTokens"] as const) spent[key] += call.usage[key];
          appendFileSync(`${directory}/calls.jsonl`, JSON.stringify({ at: new Date(), batchIndex, attempt, responseId: call.responseId, usage: call.usage, costUsd: call.costUsd }) + "\n");
          validatePresentationBatch(batch, call.output.items);
          call.output.items.forEach((update, i) => {
            const allocation = (total: number) => Math.floor(total / batch.length) + (i < total % batch.length ? 1 : 0);
            const entry: Cached = { key: keys.get(update.id)!, update, costUsd: spent.costUsd / batch.length, inputTokens: allocation(spent.inputTokens), cachedTokens: allocation(spent.cachedTokens), outputTokens: allocation(spent.outputTokens), reasoningTokens: allocation(spent.reasoningTokens) };
            appendFileSync(cachePath, JSON.stringify(entry) + "\n");
            cache.set(entry.key, entry);
          });
          complete = true;
          console.log(`Batch ${batchIndex + 1}/${batches.length}: ${batch.length} findings ready`);
          break;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          const failed = err as { usage?: Partial<typeof spent>; costUsd?: number };
          if (failed.usage) {
            spent.costUsd += failed.costUsd ?? 0;
            for (const key of ["inputTokens", "cachedTokens", "outputTokens", "reasoningTokens"] as const) spent[key] += failed.usage[key] ?? 0;
          }
          appendFileSync(`${directory}/errors.jsonl`, JSON.stringify({ at: new Date(), batchIndex, attempt, error, spent }) + "\n");
        }
      }
      if (!complete) { failures++; console.error(`Batch ${batchIndex + 1} failed: ${error}`); }
    }
  }));
  let updated = 0;
  let unchanged = 0;
  const conflicts: string[] = [];
  for (const result of results) {
    const output = result.output as Json | null;
    if (!output || !Array.isArray(output.findings)) continue;
    const findings = output.findings as Finding[];
    const entries = findings.map((_, i) => cache.get(keys.get(`${result.id}#findings.${i}`)!));
    if (entries.some(entry => !entry)) continue;
    const next = { ...output, findings: findings.map((finding, i) => withPresentation(finding, entries[i]!.update)) };
    const strip = (value: Json & { findings: Finding[] }) => ({ ...value, findings: value.findings.map(f => { const copy: Json = { ...f }; delete copy.title; delete copy.summary; copy.figures = (f.figures ?? []).map(figure => { const original: Json = { ...figure }; delete original.label; return original; }); return copy; }) });
    if (hash(strip(next)) !== hash(strip({ ...output, findings }))) throw new Error(`Original content changed: ${result.id}`);
    const sources = (result.sources ?? {}) as Json;
    if (hash(next) === hash(output) && (sources.presentation as Json | undefined)?.version === PRESENTATION_VERSION) { unchanged++; continue; }
    const totals = entries.reduce((sum, entry) => {
      for (const key of ["costUsd", "inputTokens", "outputTokens", "cachedTokens", "reasoningTokens"] as const) sum[key] += entry![key];
      return sum;
    }, { costUsd: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, reasoningTokens: 0 });
    // Keep analysis accounting unchanged; presentation costs have their own ledger and metadata.
    const saved = await db.analysisResult.updateMany({ where: { id: result.id, updatedAt: result.updatedAt, status: "done" }, data: {
      output: next as Prisma.InputJsonValue,
      sources: { ...sources, presentation: { version: PRESENTATION_VERSION, model: models.synthesis, refreshedAt: new Date().toISOString(), ...totals } } as Prisma.InputJsonValue,
    } });
    if (saved.count) updated++; else conflicts.push(result.id);
  }
  const report = { at: new Date(), findings: inputs.size, resultsUpdated: updated, resultsUnchanged: unchanged, failedBatches: failures, conflicts, complete: failures === 0 && conflicts.length === 0, originalContentPreserved: true, cachedPresentationCostUsd: [...new Set(keys.values())].reduce((sum, key) => sum + (cache.get(key)?.costUsd ?? 0), 0) };
  writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (!report.complete) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => db.$disconnect());
