import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { z } from "zod";
import { RealGateway, type StructuredResult } from "../openai";
import { taxonomyFromFile } from "../taxonomy";
import { callStructured } from "./call";
import { documentRequest } from "./request";

test("retrieval searches the entire document and accepts evidence beyond the passage limit", async () => {
  const tax = taxonomyFromFile();
  const domain = { ...tax.domain("water")!, maxResults: 2 };
  const req = documentRequest({ id: "TST-NDC1", title: "Long document", kind: "NDC", editionDate: "2026-01-01", pageCount: 93, country: { vectorStoreId: "vs_test" } }, domain, tax, "gpt-6-luna");
  let requests = 0;
  const client = new OpenAI({
    apiKey: "test-key-not-used-on-network",
    maxRetries: 0,
    fetch: async (_url, init) => {
      requests++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gpt-6-luna");
      assert.deepEqual(body.tool_choice, { type: "file_search" });
      assert.deepEqual(body.tools, [{ type: "file_search", vector_store_ids: ["vs_test"], max_num_results: 2, filters: { type: "eq", key: "document_id", value: "TST-NDC1" } }]);
      assert.deepEqual(body.include, ["file_search_call.results"]);
      assert.ok(body.input[0].content.every((c: { type: string }) => c.type === "input_text"), "no full PDF attached to the question");
      return new Response(JSON.stringify({
        id: "resp_test", object: "response", status: "completed",
        output: [
          { id: "fs_test", type: "file_search_call", status: "completed", queries: ["water conservation"], results: [{ file_id: "file_late", filename: "TST-NDC1-p93.txt", attributes: { document_id: "TST-NDC1", page: 93 }, score: 0.9, text: "Water conservation programme in the annex." }] },
          { id: "msg_test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ findings: [], not_found: true, note: "Mocked model response", citations: [] }), annotations: [] }] },
        ],
        usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 0 }, output_tokens: 20, output_tokens_details: { reasoning_tokens: 0 } },
      }), { headers: { "content-type": "application/json" } });
    },
  });
  const result = await callStructured(req, new RealGateway(client));
  assert.equal(requests, 1);
  assert.equal(result.fileSearchCalls, 1);
  assert.deepEqual(result.retrieved.map((r) => r.attributes.page), [93]);
  assert.deepEqual(result.queries, ["water conservation"]);
});

const simpleRequest = {
  model: "gpt-6-luna", instructions: "Answer from the document", text: "Question", schema: z.object({ answer: z.string() }), schemaName: "test_answer",
  fileSearch: { vectorStoreId: "vs_test", filters: { type: "eq" as const, key: "document_id", value: "TST-NDC1" }, maxNumResults: 20 },
};

function response(searches: number): StructuredResult {
  return { outputText: '{"answer":"No evidence found"}', refusal: null, incomplete: null, usage: { inputTokens: 100, cachedTokens: 0, outputTokens: 20, reasoningTokens: 0 }, fileSearchCalls: searches, queries: [], retrieved: [], responseId: "resp_test" };
}

test("a schema-valid answer without a search is retried and then rejected", async () => {
  let calls = 0;
  await assert.rejects(callStructured(simpleRequest, { structured: async (req) => {
    calls++;
    if (calls === 2) assert.match(req.text, /use file_search before answering/);
    return response(0);
  } }), /Invalid answer after 2 attempts: the answer did not search/);
  assert.equal(calls, 2);
});

test("a completed search with no matching passages may report no evidence", async () => {
  const result = await callStructured(simpleRequest, { structured: async () => response(1) });
  assert.equal(result.fileSearchCalls, 1);
  assert.equal(result.output.answer, "No evidence found");
});

test("synthesis without file search remains supported", async () => {
  const { fileSearch: _unused, ...req } = simpleRequest;
  void _unused;
  const result = await callStructured(req, { structured: async () => response(0) });
  assert.equal(result.fileSearchCalls, 0);
});
