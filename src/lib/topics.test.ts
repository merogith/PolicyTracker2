import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeUnits, type Unit } from "./topic-merge";

const unit = (over: Partial<Unit>): Unit => ({
  domainId: "d",
  domainLabel: "D",
  path: "findings.0",
  kind: "concern",
  text: "t",
  topics: [],
  citations: [],
  ...over,
});
const cite = (documentId: string, page: number, quote: string) => ({ id: `${documentId}${page}${quote}`, documentId, page, quote, verified: true });

test("matching assertions sharing a quote merge transitively, keep every topic and stage", () => {
  const a = unit({ domainId: "water", kind: "planned_action", topics: ["WAT-06"], citations: [cite("D1", 3, "Drip irrigation will expand.")] });
  const b = unit({ domainId: "agri", kind: "underway", topics: ["AGR-01"], citations: [cite("D1", 3, "drip  irrigation will expand"), cite("D1", 4, "Second quote")] });
  const c = unit({ domainId: "finance", kind: null, topics: ["CLM-02"], citations: [cite("D1", 4, "Second quote")] });
  const d = unit({ domainId: "energy", kind: "delivered", topics: ["ENE-01"], citations: [cite("D2", 1, "Unrelated")] });
  const merged = mergeUnits([a, b, c, d]);
  assert.equal(merged.length, 2);
  const big = merged.find((m) => m.units.length === 3)!;
  assert.deepEqual(big.topics, ["AGR-01", "CLM-02", "WAT-06"]);
  assert.equal(big.stage, 3);
  assert.deepEqual(big.documents, ["D1"]);
});

test("different programmes and sector statistics sharing a long quote remain separate", () => {
  const evidence = cite("BEL-NDC2", 6, "Energy Saving, Belarusian Forest and Transport System programmes were adopted.");
  const rows = ["Energy Saving programme was adopted.", "Belarusian Forest programme was adopted.", "Transport System programme was adopted."]
    .map(text => unit({ text, citations: [evidence] }));
  assert.equal(mergeUnits(rows).length, 3);
  const shares = cite("BEL-NDC2", 4, "IPPU and Waste each account for 7 per cent.");
  assert.equal(mergeUnits([
    unit({ text: "IPPU accounts for 7 per cent.", citations: [shares] }),
    unit({ text: "Waste accounts for 7 per cent.", citations: [shares] }),
  ]).length, 2);
});

test("same display title or quote cannot merge different numeric qualifications", () => {
  const evidence = cite("D1", 3, "Reduce emissions by 42 percent unconditionally and 47 percent conditionally.");
  assert.equal(mergeUnits([
    unit({ title: "Emissions target", text: "Reduce emissions by 42 percent unconditionally.", citations: [evidence] }),
    unit({ title: "Emissions target", text: "Reduce emissions by 47 percent conditionally.", citations: [evidence] }),
  ]).length, 2);
});

test("figures and 'other' findings have no stage", () => {
  const [m] = mergeUnits([unit({ kind: "other", citations: [cite("D1", 1, "x y z")] }), unit({ kind: null, citations: [cite("D1", 1, "x y z")] })]);
  assert.equal(m.stage, null);
});

test("a figure with a stage counts like a finding: a target is a commitment", () => {
  const [m] = mergeUnits([unit({ kind: "commitment", topics: ["CLM-06"], citations: [cite("D1", 3, "reduce emissions by 15 percent by 2030")] })]);
  assert.equal(m.stage, 1);
});
