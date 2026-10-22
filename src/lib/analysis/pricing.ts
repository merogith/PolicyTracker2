// USD per 1M tokens, standard tier, prompts up to 272K input tokens.
// Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-18). Edit when prices change.
// Reasoning tokens are billed as output and are included in output_tokens.

export interface ModelPrice {
  input: number;
  cachedInput: number;
  output: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-6-astra": { input: 10, cachedInput: 1, output: 50 },
  "gpt-6.1-sol": { input: 2, cachedInput: 0.1, output: 10 },
  "gpt-6-sol": { input: 2, cachedInput: 0.2, output: 10 },
  "gpt-6-luna": { input: 0.1, cachedInput: 0.01, output: 0.5 },
};

/** USD per file_search tool call ($2.50 per 1000 calls). */
export const FILE_SEARCH_CALL_USD = 2.5 / 1000;

/** Used for models missing from the table, so that costs are over- rather than under-stated. */
const FALLBACK: ModelPrice = MODEL_PRICES["gpt-6-astra"];

export function priceOf(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? FALLBACK;
}

export function costUsd(
  model: string,
  usage: { inputTokens: number; cachedTokens: number; outputTokens: number },
  fileSearchCalls = 0,
) {
  const p = priceOf(model);
  const fresh = Math.max(0, usage.inputTokens - usage.cachedTokens);
  return (
    (fresh * p.input + usage.cachedTokens * p.cachedInput + usage.outputTokens * p.output) / 1_000_000 +
    fileSearchCalls * FILE_SEARCH_CALL_USD
  );
}
