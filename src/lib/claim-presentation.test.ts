import assert from "node:assert/strict";
import { test } from "node:test";
import { displayedStage, figureDisplay, resolveSupportingFindings, sourceFindingIndex } from "./claim-presentation";
import { presentationIssue, validatePresentationBatch, withPresentation, type PresentationInput, type PresentationUpdate } from "./analysis/presentation";
import { storedSchemaFor, schemaFor } from "./analysis/schemas";

const figure = { value_as_stated: "11 June 2025", value: null, unit: "year", period: "2025", conditionality: "unconditional" };
const input: PresentationInput = { id: "saved#findings.0", text: "A working group was established on 11 June 2025.", kind: "delivered", figures: [figure], quotes: ["The working group was established on 11 June 2025."] };
const update: PresentationUpdate = { id: input.id, title: "A working group coordinates national climate planning", summary: "A working group was established in June 2025.", figure_labels: [{ index: 0, label: "Working group established" }] };

test("presentation adds headings and labels without changing complete content", () => {
  const original = { text: input.text.repeat(30), kind: "delivered", figures: [figure], citations: [{ page: 19, quote: input.quotes[0] }], topic_ids: ["CLM-01"] };
  const next = withPresentation(original, update);
  assert.equal(next.text, original.text);
  assert.equal(next.kind, original.kind);
  assert.deepEqual(next.citations, original.citations);
  assert.deepEqual(next.topic_ids, original.topic_ids);
  assert.deepEqual(next.figures, [{ ...figure, label: "Working group established" }]);
  assert.equal(original.figures[0].value_as_stated, "11 June 2025");
});

test("automatic presentation checks reject added numbers, missing labels and changed identities", () => {
  assert.equal(presentationIssue(input, update), null);
  assert.match(presentationIssue(input, { ...update, summary: "A group was established in 2026." })!, /Unsupported number/);
  assert.match(presentationIssue(input, { ...update, figure_labels: [] })!, /original figures/);
  assert.throws(() => validatePresentationBatch([input], []), /omitted/);
  assert.throws(() => validatePresentationBatch([input], [update, update]), /repeated/);
  assert.throws(() => validatePresentationBatch([input], [{ ...update, id: "another" }]), /Unknown/);
});

test("all supporting findings survive across documents; only duplicate references are removed", () => {
  const results = Array.from({ length: 2 }, (_, d) => ({
    id: `r${d}`, documentId: `KAZ-NDC${d + 1}`,
    output: { findings: Array.from({ length: 90 }, (_, i) => ({ text: `Full finding ${d}/${i}`, kind: d ? "planned_action" : "delivered", figures: [] })) },
    citations: Array.from({ length: 90 }, (_, i) => ({ id: `c${d}/${i}`, documentId: `KAZ-NDC${d + 1}`, itemPath: `findings.${i}`, page: i + 1, quote: `Exact quote ${d}/${i}`, verified: true })),
  }));
  const refs = results.flatMap(r => r.output.findings.map((_, i) => ({ resultId: r.id, path: `findings.${i}` })));
  const resolved = resolveSupportingFindings([...refs, refs[0]], sourceFindingIndex(results));
  assert.equal(resolved.length, 180);
  assert.equal(resolved[179].text, "Full finding 1/89");
  assert.equal(resolved[179].citations[0].quote, "Exact quote 1/89");
  assert.equal(displayedStage(resolved.map(f => f.kind)), "mixed");
  assert.equal(displayedStage(["delivered", "delivered"]), "delivered");
  assert.equal(displayedStage(["delivered", null]), "mixed");
});

test("dates have contextual labels without duplicate years or unconditional badges", () => {
  assert.deepEqual(figureDisplay({ ...figure, label: "Working group established" }), { label: "Working group established", value: "11 June 2025", period: null, condition: null });
  assert.equal(figureDisplay({ ...figure, value_as_stated: "Over 2024–2025", period: "2024–2025" }).value, "Over 2024–2025");
  const target = figureDisplay({ ...figure, value_as_stated: "15", unit: "%", period: "2030", label: "Emissions reduction target" });
  assert.deepEqual(target, { label: "Emissions reduction target", value: "15 %", period: "2030", condition: "Unconditional" });
});

test("legacy answers remain readable and new answers require display fields", () => {
  const old = { not_found: false, note: null, citations: [], findings: [{ text: input.text, kind: "delivered", figures: [figure], topic_ids: ["CLM-01"], unmapped_concepts: [], citations: [{ page: 19, quote: input.quotes[0] }] }] };
  assert.equal(storedSchemaFor("document").safeParse(old).success, true);
  assert.equal(schemaFor("document", ["CLM-01"]).safeParse(old).success, false);
  const classification = { statement_type:{value:"output_delivered",quotes:input.quotes}, labels:{purpose:[],geographic_scope:[],hazards:[],themes:[],affected_groups:[],policy_instruments:[],risk_component:[],risk_function:[]}, facts:[],actors:[],priority:null };
  assert.equal(schemaFor("document", ["CLM-01"]).safeParse({ ...old, findings: [{...withPresentation(old.findings[0], update), classification}] }).success, true);
});

test("a replaced document finding with different evidence is not attached to an older claim", () => {
  const quote = { id: "c1", documentId: "KAZ-NDC1", itemPath: "findings.0", page: 7, quote: "Replacement evidence", verified: true };
  const index = sourceFindingIndex([{ id: "r1", documentId: "KAZ-NDC1", output: { findings: [{ text: "Replacement finding", kind: "delivered", figures: [] }] }, citations: [quote] }]);
  const refs = [{ resultId: "r1", path: "findings.0" }];
  assert.equal(resolveSupportingFindings(refs, index, [{ ...quote, quote: "Previously copied evidence" }]).length, 0);
  assert.equal(resolveSupportingFindings(refs, index, [quote]).length, 1);
});
