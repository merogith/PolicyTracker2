/*
 * OpenAI wrapper. Every call to OpenAI in this codebase goes through the gateway below.
 *
 * Verified on 2026-10-18 against the documentation and the installed `openai` package
 * (7.38.0, types in node_modules/openai/resources/**). Re-check these when upgrading.
 *
 * Files (https://developers.openai.com/api/docs/guides/pdf-files,
 *        https://developers.openai.com/api/docs/guides/tools-file-search)
 *   - `files.create({ file, purpose })`; FilePurpose = 'assistants' | 'batch' | 'fine-tune' |
 *     'vision' | 'user_data' | 'evals'.
 *   - The original PDF is uploaded with purpose `user_data` ("use user_data for files you plan to
 *     pass as model inputs"); under 50 MB per file and per request. On vision-capable models the API
 *     sends both extracted text and page images.
 *   - Page text files for the vector store are uploaded with purpose `assistants`, as in the file
 *     search guide.
 *   - `files.delete(fileId)` deletes the file object.
 *
 * Vector stores (https://developers.openai.com/api/docs/guides/retrieval)
 *   - `vectorStores.create({ name, metadata? })`, `vectorStores.delete(id)`.
 *   - `vectorStores.fileBatches.create(storeId, { files: [{ file_id, attributes, chunking_strategy }] })`
 *     attaches up to 2000 files with per-file attributes (mutually exclusive with `file_ids`);
 *     `fileBatches.poll(storeId, batchId)` waits; batch status 'in_progress' | 'completed' |
 *     'cancelled' | 'failed' with `file_counts`.
 *   - Attributes: up to 16 keys; keys up to 64 chars; values are strings (up to 512 chars), numbers
 *     or booleans.
 *   - `vectorStores.files.list(storeId, { filter })`, filter 'in_progress' | 'completed' | 'failed' |
 *     'cancelled'; VectorStoreFile.status has the same values and `last_error.code` is
 *     'server_error' | 'unsupported_file' | 'invalid_file'.
 *   - `vectorStores.files.delete(fileId, { vector_store_id })` detaches a file from the store but
 *     does not delete the file object.
 *   - Default chunking is 800 tokens with 400 overlap; static chunking allows 100..4096 tokens with
 *     overlap at most half. We use static 2000/200 so that one page is one chunk.
 *   - Search returns 10 results by default, up to 50 with `max_num_results`.
 *
 * Responses API (https://developers.openai.com/api/docs/guides/tools-file-search,
 *                https://developers.openai.com/api/docs/guides/structured-outputs)
 *   - Input: `[{ role: 'user', content: [{ type: 'input_file', file_id }, { type: 'input_text', text }] }]`
 *     plus `instructions` for the system text.
 *   - Tool: `{ type: 'file_search', vector_store_ids, max_num_results (1..50), filters }`; filters are
 *     a ComparisonFilter `{ type: 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'in'|'nin', key, value }` or a
 *     CompoundFilter `{ type: 'and'|'or', filters: [...] }`.
 *   - `include: ['file_search_call.results']` returns the retrieved chunks (with `file_id`,
 *     `filename`, `score`, `text`, `attributes`) on the `file_search_call` output item.
 *   - `tool_choice` also accepts `{ type: 'file_search' }` to force a search; not used by default.
 *   - Structured output: `text: { format: { type: 'json_schema', name, schema, strict: true } }`.
 *     Strict mode needs `additionalProperties: false` and every property required (nullable via a
 *     union with null); root must be an object; no allOf/not/if-then-else; up to 5000 properties,
 *     10 levels of nesting, 1000 enum values. `zodTextFormat` from 'openai/helpers/zod' builds such
 *     a schema from zod v4 and keeps its parser non-enumerable, so it can go to `responses.create`.
 *   - A refusal arrives as an output content item `{ type: 'refusal', refusal }`; an incomplete
 *     response has `status: 'incomplete'` and `incomplete_details.reason` (e.g. 'max_output_tokens').
 *   - Usage: `usage.input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`,
 *     `output_tokens_details.reasoning_tokens`.
 *   - `reasoning: { effort }`; gpt-6-astra and gpt-6.1-sol accept low | medium | high | xhigh | max.
 *
 * Models (https://developers.openai.com/api/docs/models, /models/gpt-6-astra, /models/gpt-6.1-sol,
 *         https://developers.openai.com/api/docs/pricing)
 *   - Flagship for complex reasoning: `gpt-6-astra` ($10 in, $1 cached, $50 out per 1M tokens).
 *   - Lower cost, near-flagship: `gpt-6.1-sol` ($2 in, $0.10 cached, $10 out per 1M tokens).
 *   - Cheapest: `gpt-6-luna` ($0.10 in, $0.50 out per 1M tokens).
 *   - Both default models list Responses, structured outputs and file search. Their model pages do not
 *     list "file inputs"; the PDF guide says PDFs work on vision-capable models and both accept image
 *     input. Confirm full_document mode with a real call before relying on it.
 *   - File search tool calls cost $2.50 per 1000; vector storage is free up to 1 GB, then $0.10/GB/day.
 *   - Model ids come from OPENAI_MODEL and OPENAI_MODEL_CHEAP; nothing here hard-codes them.
 *
 * Retries: the SDK retries 408/409/429/5xx with exponential backoff and honours `retry-after`;
 * `maxRetries` is raised below, and calls are limited per process by OPENAI_MAX_CONCURRENCY.
 */
import OpenAI, { toFile } from "openai";
import type { ZodType } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { FakeGateway } from "./openai-fake";

export type Attributes = Record<string, string | number | boolean>;

export type AttributeFilter =
  | { type: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; key: string; value: string | number | boolean }
  | { type: "in" | "nin"; key: string; value: Array<string | number> }
  | { type: "and" | "or"; filters: AttributeFilter[] };

export interface StoreFile {
  id: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  error: string | null;
}

export interface StructuredRequest<T> {
  model: string;
  instructions: string;
  text: string;
  schema: ZodType<T>;
  schemaName: string;
  /** Retrieval mode: search this store with this filter. */
  fileSearch?: { vectorStoreId: string; filters: AttributeFilter; maxNumResults: number };
  /** Full-document mode: attach this uploaded PDF. */
  inputFileId?: string;
  maxOutputTokens?: number;
}

export interface RetrievedChunk {
  fileId: string | null;
  filename: string | null;
  score: number | null;
  attributes: Attributes;
}

export interface StructuredResult {
  /** Raw text of the model's JSON answer. */
  outputText: string;
  /** Refusal text, if the model refused. */
  refusal: string | null;
  /** Reason the response is incomplete, if it is. */
  incomplete: string | null;
  usage: { inputTokens: number; cachedTokens: number; outputTokens: number; reasoningTokens: number };
  fileSearchCalls: number;
  queries: string[];
  retrieved: RetrievedChunk[];
  responseId: string;
}

export interface OpenAIGateway {
  readonly fake: boolean;
  createVectorStore(name: string, metadata: Record<string, string>): Promise<string>;
  deleteVectorStore(vectorStoreId: string): Promise<void>;
  uploadFile(filename: string, data: Buffer, purpose: "user_data" | "assistants"): Promise<string>;
  deleteFile(fileId: string): Promise<void>;
  /** Attach files with per-file attributes; resolves when the batch is no longer in progress. */
  attachFiles(vectorStoreId: string, files: Array<{ fileId: string; attributes: Attributes }>): Promise<void>;
  listStoreFiles(vectorStoreId: string): Promise<StoreFile[]>;
  detachFile(vectorStoreId: string, fileId: string): Promise<void>;
  structured<T>(req: StructuredRequest<T>): Promise<StructuredResult>;
}

export const models = {
  get analysis() {
    return requireEnv("OPENAI_MODEL");
  },
  get synthesis() {
    return process.env.OPENAI_MODEL_CHEAP || requireEnv("OPENAI_MODEL");
  },
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set; see .env.example`);
  return v;
}

const CHUNKING = {
  type: "static" as const,
  static: { max_chunk_size_tokens: 2000, chunk_overlap_tokens: 200 },
};

/** Small per-process limiter so parallel jobs do not burst past rate limits. */
class Limiter {
  private active = 0;
  private waiting: Array<() => void> = [];
  constructor(private readonly max: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
}

class RealGateway implements OpenAIGateway {
  readonly fake = false;
  private readonly client: OpenAI;
  private readonly limiter: Limiter;

  constructor() {
    this.client = new OpenAI({
      apiKey: requireEnv("OPENAI_API_KEY"),
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES ?? 6),
      timeout: 10 * 60 * 1000,
    });
    this.limiter = new Limiter(Number(process.env.OPENAI_MAX_CONCURRENCY ?? 4));
  }

  async createVectorStore(name: string, metadata: Record<string, string>) {
    const store = await this.limiter.run(() => this.client.vectorStores.create({ name, metadata }));
    return store.id;
  }

  async deleteVectorStore(vectorStoreId: string) {
    await ignoreNotFound(() => this.limiter.run(() => this.client.vectorStores.delete(vectorStoreId)));
  }

  async uploadFile(filename: string, data: Buffer, purpose: "user_data" | "assistants") {
    const file = await this.limiter.run(async () =>
      this.client.files.create({ file: await toFile(data, filename), purpose }),
    );
    return file.id;
  }

  async deleteFile(fileId: string) {
    await ignoreNotFound(() => this.limiter.run(() => this.client.files.delete(fileId)));
  }

  async attachFiles(vectorStoreId: string, files: Array<{ fileId: string; attributes: Attributes }>) {
    for (let i = 0; i < files.length; i += 500) {
      const slice = files.slice(i, i + 500);
      const batch = await this.limiter.run(() =>
        this.client.vectorStores.fileBatches.create(vectorStoreId, {
          files: slice.map((f) => ({ file_id: f.fileId, attributes: f.attributes, chunking_strategy: CHUNKING })),
        }),
      );
      await this.client.vectorStores.fileBatches.poll(vectorStoreId, batch.id, { pollIntervalMs: 2000 });
    }
  }

  async listStoreFiles(vectorStoreId: string) {
    const out: StoreFile[] = [];
    for await (const f of this.client.vectorStores.files.list(vectorStoreId, { limit: 100 })) {
      out.push({ id: f.id, status: f.status, error: f.last_error ? `${f.last_error.code}: ${f.last_error.message}` : null });
    }
    return out;
  }

  async detachFile(vectorStoreId: string, fileId: string) {
    await ignoreNotFound(() =>
      this.limiter.run(() => this.client.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId })),
    );
  }

  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult> {
    const content: OpenAI.Responses.ResponseInputContent[] = [];
    if (req.inputFileId) content.push({ type: "input_file", file_id: req.inputFileId });
    content.push({ type: "input_text", text: req.text });

    const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: req.model,
      instructions: req.instructions,
      input: [{ role: "user", content }],
      text: { format: zodTextFormat(req.schema, req.schemaName) },
      reasoning: { effort: (process.env.OPENAI_REASONING_EFFORT as OpenAI.ReasoningEffort) || "medium" },
      max_output_tokens: req.maxOutputTokens ?? 32000,
      store: false,
    };
    if (req.fileSearch) {
      params.tools = [
        {
          type: "file_search",
          vector_store_ids: [req.fileSearch.vectorStoreId],
          max_num_results: req.fileSearch.maxNumResults,
          filters: req.fileSearch.filters as OpenAI.ComparisonFilter | OpenAI.CompoundFilter,
        },
      ];
      params.include = ["file_search_call.results"];
    }

    const res = await this.limiter.run(() => this.client.responses.create(params));

    let refusal: string | null = null;
    let fileSearchCalls = 0;
    const queries: string[] = [];
    const retrieved: RetrievedChunk[] = [];
    for (const item of res.output) {
      if (item.type === "message") {
        for (const part of item.content) if (part.type === "refusal") refusal = part.refusal;
      } else if (item.type === "file_search_call") {
        fileSearchCalls++;
        queries.push(...item.queries);
        for (const r of item.results ?? []) {
          retrieved.push({
            fileId: r.file_id ?? null,
            filename: r.filename ?? null,
            score: r.score ?? null,
            attributes: r.attributes ?? {},
          });
        }
      }
    }
    return {
      outputText: res.output_text,
      refusal,
      incomplete: res.status === "incomplete" ? (res.incomplete_details?.reason ?? "incomplete") : null,
      usage: {
        inputTokens: res.usage?.input_tokens ?? 0,
        cachedTokens: res.usage?.input_tokens_details?.cached_tokens ?? 0,
        outputTokens: res.usage?.output_tokens ?? 0,
        reasoningTokens: res.usage?.output_tokens_details?.reasoning_tokens ?? 0,
      },
      fileSearchCalls,
      queries,
      retrieved,
      responseId: res.id,
    };
  }
}

async function ignoreNotFound(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    if (err instanceof OpenAI.NotFoundError) return;
    throw err;
  }
}

/** True for errors worth retrying later (rate limits, timeouts, server errors). */
export function isTransient(err: unknown): boolean {
  if (err instanceof OpenAI.RateLimitError) {
    // insufficient_quota will not fix itself by waiting.
    return (err as { code?: string }).code !== "insufficient_quota";
  }
  return (
    err instanceof OpenAI.APIConnectionError ||
    err instanceof OpenAI.InternalServerError ||
    (err instanceof OpenAI.APIError && (err.status === 408 || err.status === 409))
  );
}

let gateway: OpenAIGateway | null = null;

export function openai(): OpenAIGateway {
  if (!gateway) gateway = process.env.OPENAI_FAKE === "1" ? new FakeGateway() : new RealGateway();
  return gateway;
}
