import assert from "node:assert/strict";
import { test } from "node:test";
import { repairEvidence } from "./repair-evidence";
import type { StructuredResult } from "../openai";

const pages = new Map([[5, { page: 5, label: null, text: "The source lists renewable energy, energy saving and forestry laws." }]]);
const result = (quote: string): StructuredResult => ({
  outputText: JSON.stringify({ citations: [{ page: 5, quote }] }),
  responseId: "offline", refusal: null, incomplete: null,
  usage: { inputTokens: 10, cachedTokens: 0, outputTokens: 10, reasoningTokens: 0 },
  fileSearchCalls: 0, queries: [], retrieved: [],
});
test("citation repair changes only quotation fields and requires source matching", async () => {
  const findings = [{ text: "The source lists energy legislation.", citations: [{ page: 5, quote: "The source lists renewable energy, and energy saving and forestry laws." }] }];
  const repaired = await repairEvidence(findings, pages, "gpt-6-luna", "offline-test", {
    structured: async () => result(pages.get(5)!.text),
  });
  assert.equal(findings[0].text, "The source lists energy legislation.");
  assert.equal(findings[0].citations[0].quote, pages.get(5)!.text);
  assert.deepEqual(repaired.unresolved, {});
});
test("failed citation repair preserves the candidate and reports it as unresolved", async () => {
  const findings = [{ text: "Some assertion.", citations: [{ page: 5, quote: "Not in the source" }] }];
  const original = structuredClone(findings);
  const repaired = await repairEvidence(findings, pages, "gpt-6-luna", "offline-test", {
    structured: async () => result("Still not in the source"),
  });
  assert.deepEqual(findings, original);
  assert.match(repaired.unresolved["findings.0"], /does not match/);
});
