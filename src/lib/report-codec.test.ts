import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeReport, decodeReport } from "./report-codec";

test("JSON report round-trip retains shared evidence identity, maps and dates", () => {
  const claim = { text: "One claim", quote: "−2 percent" };
  const original = { topics: [[claim], [claim]], index: new Map([["a", claim]]), at: new Date("2026-10-20T00:00:00Z"), method: () => 1 };
  const saved = JSON.parse(JSON.stringify(encodeReport(original)));
  const restored = decodeReport<typeof original>(saved);
  assert.equal(restored.topics[0][0], restored.topics[1][0]);
  assert.equal(restored.index.get("a"), restored.topics[0][0]);
  assert.equal(restored.at.toISOString(), original.at.toISOString());
  assert.equal(restored.method, undefined);
  claim.text = "Changed later";
  assert.equal(restored.topics[0][0].text, "One claim");
});
