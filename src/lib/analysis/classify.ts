import { callStructured, type CallDiagnostics } from "./call";
import { labelRequest, resolveLabelEvidence, validateLabelBatch, type LabelInput } from "./labels";
import type { Classification } from "../labels";
import type { OpenAIGateway } from "../openai";

/** Isolate bad classifications while keeping every source finding intact. */
export async function classifyFindings(inputs: LabelInput[], model: string, context: string, gateway?: Pick<OpenAIGateway, "structured">) {
  const classifications = new Map<string, Classification>();
  const errors: Record<string, string> = {};
  const usage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let costUsd = 0;
  const diagnosticFiles: string[] = [];
  function account(call: CallDiagnostics) {
    if (call.usage) for (const key of Object.keys(usage) as Array<keyof typeof usage>) usage[key] += call.usage[key];
    costUsd += call.costUsd ?? 0;
    if (call.diagnosticFile) diagnosticFiles.push(call.diagnosticFile);
  }
  async function batch(items: LabelInput[]) {
    const resolve = (candidates: Array<{ id: string; classification: Classification }>) => candidates.map(item => {
      const input = items.find(i => i.id === item.id);
      if (!input) throw new Error(`Unknown finding ${item.id}`);
      return { ...item, classification: resolveLabelEvidence(input, item.classification) };
    });
    try {
      const call = await callStructured({
        ...labelRequest(items, model), diagnosticContext: `${context}:classification:${items.map(i => i.id).join(",")}`,
        validateOutput: output => validateLabelBatch(items, resolve(output.items)),
      }, gateway);
      account(call);
      for (const item of resolve(call.output.items)) classifications.set(item.id, item.classification);
    } catch (error) {
      const failed = error as CallDiagnostics;
      account(failed);
      // Retain valid siblings from the final candidate before retrying only the unresolved ones.
      const candidate = failed.lastOutput as { items?: Array<{ id: string; classification: Classification }> } | undefined;
      for (const input of items) {
        const matches = candidate?.items?.filter(i => i.id === input.id) ?? [];
        if (matches.length !== 1) continue;
        try {
          const classification = resolveLabelEvidence(input, matches[0].classification);
          validateLabelBatch([input], [{ id: input.id, classification }]);
          classifications.set(input.id, classification);
        } catch { /* Invalid evidence stays unclassified. */ }
      }
      const remaining = items.filter(i => !classifications.has(i.id));
      if (items.length > 1) {
        for (const input of remaining) await batch([input]);
      } else {
        for (const input of remaining) errors[input.id] = error instanceof Error ? error.message : String(error);
      }
    }
  }
  const batches: LabelInput[][] = [];
  for (const input of inputs) {
    if (!input.quotes.length) { errors[input.id] = "No fully verified quotation available"; continue; }
    let current = batches.at(-1);
    if (!current || current.length >= 5 || JSON.stringify([...current, input]).length > 24000) batches.push(current = []);
    current.push(input);
  }
  let cursor = 0;
  await Promise.all([0, 1].map(async () => {
    while (cursor < batches.length) await batch(batches[cursor++]);
  }));
  return { classifications, errors, usage, costUsd, diagnosticFiles };
}
