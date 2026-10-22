import assert from "node:assert/strict";
import { test } from "node:test";
import { zodTextFormat } from "openai/helpers/zod";
import { taxonomyFromFile } from "../taxonomy";
import { citationLists, extractionSchemaFor, retagSchema, schemaFor, schemaName, storedSchemaFor, type Scope } from "./schemas";
import { FACETS } from "../labels";

const ids = taxonomyFromFile().topicIds;

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  $defs?: Record<string, JsonSchema>;
};

/** Strict mode: every object closed and every property required (docs: structured outputs). */
function assertStrict(s: JsonSchema, path: string) {
  if (s.properties) {
    assert.equal(s.additionalProperties, false, `${path}: additionalProperties must be false`);
    assert.deepEqual([...(s.required ?? [])].sort(), Object.keys(s.properties).sort(), `${path}: all properties required`);
    for (const [k, v] of Object.entries(s.properties)) assertStrict(v, `${path}.${k}`);
  }
  if (s.items) assertStrict(s.items, `${path}[]`);
  for (const [i, v] of (s.anyOf ?? []).entries()) assertStrict(v, `${path}|${i}`);
  for (const [k, v] of Object.entries(s.$defs ?? {})) assertStrict(v, `$defs.${k}`);
}

for (const scope of ["document", "country"] as Scope[]) {
  test(`${scope}: strict JSON schema`, () => {
    const format = zodTextFormat(schemaFor(scope, ids), schemaName(scope));
    assert.equal(format.strict, true);
    assert.match(format.name, /^[a-zA-Z0-9_]+$/);
    const schema = format.schema as JsonSchema;
    assertStrict(schema, format.name);
    const finding = schema.properties!.findings.items!;
    for (const k of ["title", "summary", "text", "kind", "figures", "citations"]) assert.ok(k in finding.properties!, k);
    assert.equal("topic_ids" in finding.properties!, scope === "document", "only document findings carry topic tags");
    if (scope === "country") for (const k of ["by_document", "changes_between_editions"]) assert.ok(k in schema.properties!);
    assert.deepEqual(Object.keys(format).sort(), ["name", "schema", "strict", "type"]);
  });
}

test("re-tag schema is strict", () => {
  assertStrict(zodTextFormat(retagSchema(ids), "retag").schema as JsonSchema, "retag");
});

test("extraction is strict and independent of classification, with evidence required per finding", () => {
  const schema = extractionSchemaFor(ids);
  assertStrict(zodTextFormat(schema, "extraction").schema as JsonSchema, "extraction");
  const output = { findings: [finding({ classification: undefined })], not_found: false, note: null, citations: [] };
  assert.ok(schema.safeParse(output).success);
  assert.equal(schema.safeParse({ ...output, findings: [finding({ citations: [] })] }).success, false);
});

const finding = (over: Record<string, unknown>) => ({
  title: "A documented policy commitment",
  summary: "The document sets a policy commitment.",
  text: "A",
  classification: { statement_type: { value:"commitment", quotes:["q1"] }, labels: Object.fromEntries(FACETS.map(f=>[f,[]])), facts:[], actors:[], priority:null },
  kind: "commitment",
  figures: [{ label: "Emissions reduction target", value_as_stated: "15 percent", value: "15", unit: "%", period: "2030", conditionality: "unconditional" }],
  topic_ids: ["CLM-06"],
  unmapped_concepts: [],
  citations: [{ page: 3, quote: "q1" }],
  ...over,
});

test("a document answer validates and lists its citations by path", () => {
  const output = { findings: [finding({}), finding({ kind: "delivered", topic_ids: [], citations: [{ page: 4, quote: "q2" }, { page: 5, quote: "q3" }] })], not_found: false, note: null, citations: [] };
  const parsed = schemaFor("document", ids).safeParse(output);
  assert.ok(parsed.success);
  assert.deepEqual(citationLists(parsed.data as Record<string, unknown>).map((l) => [l.path, l.citations.length]), [["", 0], ["findings.0", 1], ["findings.1", 2]]);
});

test("a topic ID outside the taxonomy is rejected when asking, accepted when reading old answers", () => {
  const out = { findings: [finding({ topic_ids: ["XYZ-99"] })], not_found: false, note: null, citations: [] };
  assert.equal(schemaFor("document", ids).safeParse(out).success, false);
  assert.equal(storedSchemaFor("document").safeParse(out).success, true);
});

test("an unknown kind or conditionality is rejected", () => {
  assert.equal(schemaFor("document", ids).safeParse({ findings: [finding({ kind: "score" })], not_found: false, note: null, citations: [] }).success, false);
  const badFigure = finding({ figures: [{ value_as_stated: "1", value: "1", unit: null, period: null, conditionality: "maybe" }] });
  assert.equal(schemaFor("document", ids).safeParse({ findings: [badFigure], not_found: false, note: null, citations: [] }).success, false);
});
