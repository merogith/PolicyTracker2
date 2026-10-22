import type { z } from "zod";
import { Permanent } from "../jobs";
import { openai, type RetrievedChunk, type StructuredRequest } from "../openai";
import { costUsd } from "./pricing";
import { retryText } from "./prompt";

export interface CallOutcome<T> {
  output: T;
  usage: { inputTokens: number; cachedTokens: number; outputTokens: number; reasoningTokens: number };
  fileSearchCalls: number;
  costUsd: number;
  queries: string[];
  retrieved: RetrievedChunk[];
}

/**
 * Ask for structured JSON and validate it. On a validation failure, a refusal or a truncated answer,
 * ask once more with the error appended; after that the result fails.
 */
export async function callStructured<S extends z.ZodType>(req: StructuredRequest<z.infer<S>> & { schema: S }): Promise<CallOutcome<z.infer<S>>> {
  const usage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let fileSearchCalls = 0;
  const queries: string[] = [];
  const retrieved: RetrievedChunk[] = [];
  let text = req.text;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await openai().structured({ ...req, text });
    usage.inputTokens += res.usage.inputTokens;
    usage.cachedTokens += res.usage.cachedTokens;
    usage.outputTokens += res.usage.outputTokens;
    usage.reasoningTokens += res.usage.reasoningTokens;
    fileSearchCalls += res.fileSearchCalls;
    queries.push(...res.queries);
    retrieved.push(...res.retrieved);

    if (res.refusal) lastError = `the model refused: ${res.refusal}`;
    else if (res.incomplete) lastError = `the answer was cut off (${res.incomplete})`;
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
          return {
            output: parsed.data,
            usage,
            fileSearchCalls,
            costUsd: costUsd(req.model, usage, fileSearchCalls),
            queries,
            retrieved,
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
  Object.assign(err, { usage, costUsd: costUsd(req.model, usage, fileSearchCalls) });
  throw err;
}
