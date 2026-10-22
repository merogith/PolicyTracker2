import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyFindings } from "./classify";
import type { Classification } from "../labels";
import type { StructuredResult } from "../openai";

function classification(bad = false): Classification {
  return { statement_type: { value: "context", quotes: ["Q0"] },
    labels: { purpose: [], geographic_scope: [], hazards: [], themes: [], affected_groups: [], policy_instruments: [], risk_component: [], risk_function: [] },
    facts: [], actors: bad ? [{ name: "Invented ministry", role: "responsible", quotes: ["Q0"] }] : [], priority: null };
}
const response = (items: unknown[]): StructuredResult => ({
  outputText: JSON.stringify({ items }), responseId: "offline", refusal: null, incomplete: null,
  usage: { inputTokens: 10, outputTokens: 10, cachedTokens: 0, reasoningTokens: 0 }, fileSearchCalls: 0, queries: [], retrieved: [],
});
test("one invalid classification cannot discard a valid sibling or source findings", async () => {
  const inputs = [
    { id: "a", text: "A measure exists.", quotes: ["A measure exists."] },
    { id: "b", text: "Another measure exists.", quotes: ["Another measure exists."] },
  ];
  const before = structuredClone(inputs);
  let calls = 0;
  const result = await classifyFindings(inputs, "gpt-6-luna", "offline-test", { structured: async () => {
    calls++;
    return response(calls <= 2 ? [{ id: "a", classification: classification() }, { id: "b", classification: classification(true) }]
      : [{ id: "b", classification: classification(true) }]);
  } });
  assert.equal(calls, 4);
  assert.deepEqual(inputs, before);
  assert.equal(result.classifications.size, 1);
  assert.deepEqual(result.classifications.get("a")!.statement_type.quotes, inputs[0].quotes);
  assert.match(result.errors.b, /Actor name/);
  assert.equal(result.usage.inputTokens, 40);
});
test("unverified findings remain explicitly unclassified without model requests", async () => {
  const result = await classifyFindings([{ id: "a", text: "Unmatched", quotes: [] }], "gpt-6-luna", "offline-test", {
    structured: async () => { throw new Error("must not call"); },
  });
  assert.equal(result.classifications.size, 0);
  assert.match(result.errors.a, /verified/);
});
