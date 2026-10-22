import type { z } from "zod";
import { Permanent } from "../jobs";
import { openai, type OpenAIGateway, type RetrievedChunk, type StructuredRequest } from "../openai";
import { costUsd } from "./pricing";
import { retryText } from "./prompt";
import { appendFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isDemoId } from "../ai-mode";
import { recordJobResponse } from "../job-usage";

export interface CallOutcome<T> {
  output: T;
  responseId: string;
  usage: { inputTokens: number; cachedTokens: number; outputTokens: number; reasoningTokens: number };
  fileSearchCalls: number;
  costUsd: number;
  queries: string[];
  retrieved: RetrievedChunk[];
  diagnosticFile?: string;
}

export type CallDiagnostics = Partial<Omit<CallOutcome<unknown>, "output">> & { lastOutput?: unknown };

/**
 * Ask for structured JSON and validate it. On a validation failure, a refusal or a truncated answer,
 * ask once more with the error appended; after that the result fails.
 */
export async function callStructured<S extends z.ZodType>(
  req: StructuredRequest<z.infer<S>> & { schema: S; validateOutput?: (output: z.infer<S>) => void; diagnosticContext?: string },
  gateway: Pick<OpenAIGateway, "structured"> & Partial<Pick<OpenAIGateway, "fake">> = openai(),
): Promise<CallOutcome<z.infer<S>>> {
  const usage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let fileSearchCalls = 0;
  let totalCostUsd = 0;
  const queries: string[] = [];
  const retrieved: RetrievedChunk[] = [];
  let text = req.text;
  let lastError = "";
  let lastOutput: unknown;
  const diagnosticFile = req.diagnosticContext ? `output/analysis-attempts/${Date.now()}-${randomUUID()}.jsonl` : undefined;
  if (diagnosticFile) mkdirSync("output/analysis-attempts", { recursive: true });

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res;
    try { res = await gateway.structured({ ...req, text }); }
    catch (error) {
      if (diagnosticFile) appendFileSync(diagnosticFile, JSON.stringify({ context: req.diagnosticContext, attempt, error: String(error) }) + "\n");
      if (error instanceof Error) Object.assign(error, { usage, fileSearchCalls, queries, retrieved, diagnosticFile, lastOutput, costUsd: totalCostUsd });
      throw error;
    }
    const demo = gateway.fake === true || isDemoId(res.responseId);
    const responseCost = demo ? 0 : costUsd(req.model, res.usage, res.fileSearchCalls);
    recordJobResponse(demo, res.usage, responseCost);
    totalCostUsd += responseCost;
    if (!demo) {
      usage.inputTokens += res.usage.inputTokens;
      usage.cachedTokens += res.usage.cachedTokens;
      usage.outputTokens += res.usage.outputTokens;
      usage.reasoningTokens += res.usage.reasoningTokens;
    }
    fileSearchCalls += res.fileSearchCalls;
    queries.push(...res.queries);
    retrieved.push(...res.retrieved);
    if (diagnosticFile) appendFileSync(diagnosticFile, JSON.stringify({ context: req.diagnosticContext, attempt, model: req.model, response: res }) + "\n");

    if (res.refusal) lastError = `the model refused: ${res.refusal}`;
    else if (res.incomplete) lastError = `the answer was cut off (${res.incomplete})`;
    else if (req.fileSearch && res.fileSearchCalls === 0) lastError = "the answer did not search the document; use file_search before answering";
    else {
      let json: unknown;
      try {
        json = JSON.parse(res.outputText);
      } catch {
        json = undefined;
        lastError = "the answer is not valid JSON";
      }
      if (json !== undefined) {
        const parsed = req.schema.safeParse(json);
        if (parsed.success) {
          lastOutput = parsed.data;
          try { req.validateOutput?.(parsed.data); }
          catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            if (diagnosticFile) appendFileSync(diagnosticFile, JSON.stringify({ attempt, validationError: lastError }) + "\n");
            text = req.text + "\n\nPrevious candidate to repair:\n```json\n" + JSON.stringify(parsed.data) + "\n```" + retryText(lastError);
            continue;
          }
          return {
            output: parsed.data,
            responseId: res.responseId,
            usage,
            fileSearchCalls,
            costUsd: totalCostUsd,
            queries,
            retrieved,
            diagnosticFile,
          };
        }
        lastError = parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
      }
    }
    text = req.text + retryText(lastError);
  }
  const err = new Permanent(`Invalid answer after 2 attempts: ${lastError}`);
  Object.assign(err, { usage, fileSearchCalls, queries, retrieved, diagnosticFile, lastOutput, costUsd: totalCostUsd });
  throw err;
}
