import "dotenv/config";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { models, openai } from "../src/lib/openai";
import { isDemoSource } from "../src/lib/ai-mode";
import { checkCap } from "../src/lib/cost";
import { costUsd } from "../src/lib/analysis/pricing";
import { callStructured } from "../src/lib/analysis/call";
import { labelRequest, resolveLabelEvidence, validateLabelBatch, type LabelInput } from "../src/lib/analysis/labels";
import { LABEL_VERSION, readClassification, type Classification } from "../src/lib/labels";

type Json = Record<string, unknown>;
type Cached = { key: string; classification: Classification; costUsd: number };
const directory = "output/claim-labels";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function main() {
  if (openai().fake) throw new Error("Label recovery requires live mode; demo labels will not be presented as source classification.");
  const at = process.argv.indexOf("--result");
  const results = (await db.analysisResult.findMany({
    where: { status: "done", scope: "document", ...(at >= 0 ? { id: process.argv[at + 1] } : {}) },
    include: { citations: true }, orderBy: { id: "asc" },
  })).filter(r => !isDemoSource(r.sources));
  const cache = new Map<string, Cached>();
  const cacheFile = `${directory}/cache.jsonl`;
  if (existsSync(cacheFile)) for (const line of readFileSync(cacheFile, "utf8").split("\n").filter(Boolean)) {
    const entry = JSON.parse(line) as Cached; cache.set(entry.key, entry);
  }
  const inputs = new Map<string, LabelInput>(), keys = new Map<string, string>();
  const unavailable: string[] = [];
  for (const result of results) {
    const findings = ((result.output as Json)?.findings ?? []) as Json[];
    for (const [i, finding] of findings.entries()) {
      const id = `${result.id}#findings.${i}`;
      if (readClassification(finding) && finding.classification_version === LABEL_VERSION) continue;
      const quotes = [...new Set(result.citations.filter(c => c.itemPath === `findings.${i}` && c.verified).map(c => c.quote))];
      if (!quotes.length) { unavailable.push(id); continue; }
      const input = { id, text: String(finding.text), quotes };
      // Identical findings can reuse the same classification without losing their own source IDs.
      const key = hash({ version: LABEL_VERSION, model: models.synthesis, text: input.text, quotes: [...quotes].sort() });
      inputs.set(id, input); keys.set(id, key);
    }
  }
  const pending = [...new Map([...inputs.values()].filter(i => !cache.has(keys.get(i.id)!)).map(i => [keys.get(i.id)!, i])).values()];
  const batches: LabelInput[][] = [];
  for (const input of pending) {
    let batch = batches.at(-1);
    if (!batch || batch.length >= 8 || JSON.stringify([...batch, input]).length > 30000) batches.push(batch = []);
    batch.push(input);
  }
  const estimatedUsd = costUsd(models.synthesis, { inputTokens: Math.ceil(JSON.stringify(pending).length / 3) + batches.length * 2500, cachedTokens: 0, outputTokens: pending.length * 1600 });
  console.log(JSON.stringify({ results: results.length, findingsToEnrich: inputs.size, evidenceUnavailable: unavailable.length, pendingUnique: pending.length, batches: batches.length, model: models.synthesis, estimatedUsd }));
  if (process.argv.includes("--dry-run")) return;
  const capError = checkCap(estimatedUsd); if (capError) throw new Error(capError);
  mkdirSync(directory, { recursive: true });
  // Recovery snapshot and append-only call ledger remain local.
  writeFileSync(`${directory}/before-${Date.now()}.json`, JSON.stringify(results.map(r => ({ id: r.id, output: r.output, sources: r.sources }))));
  let cursor = 0, failures = 0;
  await Promise.all([0, 1, 2, 3].map(async () => {
    while (cursor < batches.length) {
      const index = cursor++, batch = batches[index];
      try {
        const resolve=(items:Array<{id:string;classification:Classification}>)=>items.map(item=>{
          const input=batch.find(input=>input.id===item.id);
          if(!input)throw new Error(`Unknown finding id ${item.id}`);
          return {...item,classification:resolveLabelEvidence(input,item.classification)};
        });
        const call = await callStructured({ ...labelRequest(batch, models.synthesis), validateOutput: output => {
          try { validateLabelBatch(batch, resolve(output.items)); }
          catch(error) {
            appendFileSync(`${directory}/invalid-outputs.jsonl`,JSON.stringify({index,items:output.items,error:String(error)})+"\n");
            throw error;
          }
        } });
        appendFileSync(`${directory}/calls.jsonl`, JSON.stringify({ at: new Date(), index, responseId: call.responseId, usage: call.usage, costUsd: call.costUsd }) + "\n");
        for (const item of resolve(call.output.items)) {
          const entry = { key: keys.get(item.id)!, classification: item.classification, costUsd: call.costUsd / batch.length };
          appendFileSync(cacheFile, JSON.stringify(entry) + "\n"); cache.set(entry.key, entry);
        }
        console.log(`Labels ${index + 1}/${batches.length}: ${batch.length} findings classified`);
      } catch (error) {
        const detail=error as {costUsd?:number;usage?:unknown};
        appendFileSync(`${directory}/errors.jsonl`, JSON.stringify({ at: new Date(), index, error: String(error), costUsd:detail.costUsd, usage:detail.usage }) + "\n");
        if(batch.length>1&&String(error).includes("Invalid answer after")){
          const middle=Math.ceil(batch.length/2);
          batches.push(batch.slice(0,middle),batch.slice(middle));
          console.log(`Labels ${index+1}: retrying ${batch.length} findings in smaller batches after validation failure`);
        }else{
          failures++;
          console.error(`Labels ${index + 1}/${batches.length} unresolved: ${String(error)}`);
        }
      }
    }
  }));
  let updated = 0, classified = 0;
  const conflicts: string[] = [];
  for (const result of results) {
    const output = result.output as Json;
    let changed = false;
    let enrichedCount = 0;
    const findings = ((output.findings ?? []) as Json[]).map((finding, i) => {
      const id = `${result.id}#findings.${i}`, entry = cache.get(keys.get(id) ?? "");
      if (!entry) return finding;
      validateLabelBatch([inputs.get(id)!], [{ id, classification: entry.classification }]);
      changed = true; enrichedCount++;
      return { ...finding, classification: entry.classification, classification_version: LABEL_VERSION };
    });
    if (!changed) continue;
    const saved = await db.analysisResult.updateMany({
      where: { id: result.id, status: "done", updatedAt: result.updatedAt },
      data: { output: { ...output, findings } as Prisma.InputJsonValue,
        sources: { ...((result.sources ?? {}) as Json), labelRecovery: { version: LABEL_VERSION, model: models.synthesis, at: new Date().toISOString() } } as Prisma.InputJsonValue },
    });
    if (saved.count) { updated++; classified += enrichedCount; } else conflicts.push(result.id);
  }
  const report = { at: new Date(), version: LABEL_VERSION, classified, resultsUpdated: updated, failedBatches: failures, conflicts, evidenceUnavailable: unavailable, cachedCostUsd: [...cache.values()].reduce((sum, c) => sum + c.costUsd, 0), originalContentPreserved: true };
  writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (failures || conflicts.length) process.exitCode = 1;
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; }).finally(() => db.$disconnect());
