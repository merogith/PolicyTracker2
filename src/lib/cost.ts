// Cost estimates made before work is queued, checked against MAX_USD_PER_RUN.
import { priceOf, FILE_SEARCH_CALL_USD } from "./analysis/pricing";

/** Rough token counts per call; real usage is recorded on every result. */
const ANALYSIS_INPUT_TOKENS = 19_000; // about 15k of retrieved pages plus 4k of instructions and taxonomy
const OUTPUT_TOKENS = 4_000; // answer plus reasoning
const SYNTHESIS_INPUT_PER_DOC = 2_500;
const RETAG_INPUT_TOKENS = 5_000; // taxonomy plus the findings
const RETAG_OUTPUT_TOKENS = 800;

function model(kind: "analysis" | "cheap") {
  return (kind === "analysis" ? process.env.OPENAI_MODEL : process.env.OPENAI_MODEL_CHEAP || process.env.OPENAI_MODEL) ?? "";
}

function usd(m: string, input: number, output: number, searches = 0) {
  const p = priceOf(m);
  return (input * p.input + output * p.output) / 1_000_000 + searches * FILE_SEARCH_CALL_USD;
}

/** One domain question for one document. */
export function estimateDocumentDomain() {
  return usd(model("analysis"), ANALYSIS_INPUT_TOKENS, OUTPUT_TOKENS, 1);
}

/** Every domain question for one document. */
export function estimateDocument(domainCount: number) {
  return { usd: domainCount * estimateDocumentDomain(), calls: domainCount };
}

/** One combined summary for one domain and country. */
export function estimateSynthesis(documentCount: number) {
  if (documentCount <= 1) return 0;
  return usd(model("cheap"), 3_000 + documentCount * SYNTHESIS_INPUT_PER_DOC, OUTPUT_TOKENS);
}

/** Re-labelling one stored answer with a new taxonomy version. */
export function estimateRetag() {
  return usd(model("cheap"), RETAG_INPUT_TOKENS, RETAG_OUTPUT_TOKENS);
}

export function maxUsdPerRun() {
  const raw = process.env.MAX_USD_PER_RUN?.trim();
  if (!raw || raw === "0") return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) throw new Error("MAX_USD_PER_RUN must be a non-negative amount; 0 or blank disables the application estimate cap.");
  return v;
}

/** A message if the estimate is over the cap, else null. */
export function checkCap(estimateUsd: number): string | null {
  const cap = maxUsdPerRun();
  return cap !== null && estimateUsd > cap ? `Estimated cost $${estimateUsd.toFixed(2)} exceeds the cap of $${cap.toFixed(2)} per run.` : null;
}
