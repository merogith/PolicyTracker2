import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRegionalReferences, countActions, DEFAULT_ACTION_STAGES, deviationBand, formatMetric, metricValue, normalizedMetric, parseActionStages, parseDashboardMetric, parseMetricScale, regionalReference, standardNormalCdf } from "./dashboard-metrics";
import { aggregateDocumentation } from "./documentation-stage";
import type { DocumentationDashboard, DocumentationSummary } from "./documentation-score";
import type { MergedItem } from "./topic-merge";

function summary(findings: number, actions: number, score = 50, complete = true): DocumentationSummary {
  return {
    findings, actions, responses: actions, context: findings-actions, topicsAddressed: 2, topicsWithResponses: 1, topicCount: 2,
    coveragePercent: 100, responseCoveragePercent: 50, processedTopics: complete ? 2 : 1, processingComplete: complete,
    processingState: complete ? "complete" : "partial",
    countsProvisional: true, score: { ...aggregateDocumentation([2,2], complete), value: score },
    claimScore: { value: actions*2, scoredClaims: findings, unresolvedClaims: 0, unmatchedClaims: 0, totalClaims: findings, complete, distribution: [findings-actions,0,actions,0,0] },
    detail: { score: null, label: "Assessment unavailable", tone: "gray", reason: "Fixture" },
    change: { symbol: "—", label: "Fixture" },
  };
}
function dashboard(country: DocumentationSummary, domain = country, demo = false): DocumentationDashboard {
  return { demo, country, domains: [{ ...domain, id: "A", label: "Water" }], topics: [], methodNote: "", countNote: "" };
}
function group(kinds: Array<[string | null, string[]]>): MergedItem {
  return { stage: 4, topics: [], documents: [], units: kinds.map(([kind, topics]) => ({ kind, topics, domainId: "A", domainLabel: "A", path: "findings.0", text: "fixture", citations: [] })) };
}
function approximately(actual: number | null, expected: number) {
  assert.ok(actual !== null && Math.abs(actual-expected) < 0.00001, `Expected ${expected}, got ${actual}`);
}

test("scores and percentages round to whole numbers while counts and unavailable values retain their meaning", () => {
  assert.deepEqual([0,25,50,75,100,100*29/44,49.25,49.5].map(value=>formatMetric(value,"/100")),
    ["0","25","50","75","100","66","49","50"]);
  assert.equal(formatMetric(163," pts"), "163");
  assert.equal(formatMetric(124), "124");
  assert.deepEqual([68.75,100*5/6,100*4/7,100*6/7,100*5/7].map(value=>formatMetric(value,"%")),
    ["69","83","57","86","71"]);
  for (const value of [null,NaN,Infinity]) assert.equal(formatMetric(value,"/100"), "—");
});

test("normal CDF matches reference probabilities, including both tails and the exact midpoint", () => {
  const reference = [
    [-3, 0.0013498980316301], [-2, 0.0227501319481792], [-1, 0.1586552539314571],
    [0, 0.5], [1, 0.8413447460685429], [2, 0.9772498680518208], [3, 0.9986501019683699],
  ];
  for (const [z, probability] of reference) approximately(100*standardNormalCdf(z), 100*probability);
  assert.equal(standardNormalCdf(0), 0.5);
  const values = [-100, -10, -3, -1, 0, 1, 3, 10, 100].map(standardNormalCdf);
  assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.deepEqual([...values].sort((a,b)=>a-b), values);
});

test("action stages default to commitments through delivery; forms and empty selections survive parsing", () => {
  assert.deepEqual(parseActionStages(undefined), [1,2,3,4]);
  assert.deepEqual(parseActionStages(["", "3", "4", "3"]), [3,4]);
  assert.deepEqual(parseActionStages("0,2,4"), [0,2,4]);
  assert.deepEqual(parseActionStages(""), []);
  assert.deepEqual(parseActionStages("unknown"), [1,2,3,4]);
  assert.deepEqual(parseActionStages("-1,99"), [1,2,3,4]);
  assert.equal(parseDashboardMetric("actions"), "actions");
  assert.equal(parseDashboardMetric("score"), "detail");
  assert.equal(parseMetricScale("normalized", "coverage"), "raw");
});

test("action selection uses member kinds, deduplicates mixed groups and respects local topic attribution", () => {
  const shared = group([["concern",["A"]],["planned_action",["B"]],["delivered",["B"]]]);
  const context = group([["concern",["A"]]]);
  const unknown = group([[null,[]],["other",[]]]);
  assert.equal(countActions([shared,shared,context,unknown], DEFAULT_ACTION_STAGES), 1);
  assert.equal(countActions([shared], [2,4], new Set(["B"])), 1);
  assert.equal(countActions([shared], [4], new Set(["A"])), 0);
  assert.equal(countActions([shared,context], [0]), 2);
  assert.equal(countActions([shared,unknown], []), 0);
});

test("regional standardization uses same-domain mean and population SD, separate from country totals", () => {
  const a = dashboard(summary(100,40),summary(10,4));
  const b = dashboard(summary(200,60),summary(5,2));
  const refs = buildRegionalReferences([a,b], "claims");
  assert.equal(refs.country.maximum, 200);
  assert.equal(refs.domains.A.maximum, 10);
  approximately(normalizedMetric(a.country,"claims",refs.country), 15.86552539314571);
  approximately(normalizedMetric(a.domains[0],"claims",refs.domains.A), 84.13447460685429);
  approximately(normalizedMetric(b.domains[0],"claims",refs.domains.A), 15.86552539314571);
});

test("normalized score and actions each use their own metric reference", () => {
  const a = dashboard(summary(100,10,80)), b = dashboard(summary(200,40,60));
  const scores = buildRegionalReferences([a,b],"detail"), actions = buildRegionalReferences([a,b],"actions");
  approximately(normalizedMetric(a.country,"detail",scores.country), 84.13447460685429);
  approximately(normalizedMetric(a.country,"actions",actions.country), 15.86552539314571);
});

test("unfinished, missing, invalid and demo assessments cannot set or receive a regional benchmark", () => {
  const a = dashboard(summary(10,2)), b = dashboard(summary(20,4));
  const pending = dashboard(summary(1000,500,100,false));
  const demo = dashboard(summary(2000,1000),undefined,true);
  const missing = dashboard({ ...summary(500,100), coveragePercent: null });
  const invalid = dashboard(summary(Infinity,NaN));
  const refs = buildRegionalReferences([a,b,pending,demo,missing,invalid],"claims");
  assert.deepEqual(refs.country, { maximum: 20, mean: 15, standardDeviation: 5, values: [10,20], countries: 2, total: 5 });
  assert.equal(normalizedMetric(pending.country,"claims",refs.country), null);
  assert.equal(normalizedMetric(demo.country,"claims",refs.country,true), null);
  assert.equal(metricValue(missing.country,"claims"), null);
  assert.equal(normalizedMetric(invalid.country,"claims",refs.country), null);
});

test("one country is unavailable; tied zero or positive totals share the midpoint", () => {
  const zero = dashboard(summary(0,0));
  assert.equal(buildRegionalReferences([zero],"claims").country.maximum,null);
  assert.equal(normalizedMetric(zero.country,"claims",buildRegionalReferences([zero],"claims").country),null);
  assert.equal(normalizedMetric(zero.country,"claims",buildRegionalReferences([zero,zero],"claims").country),50);
  const positive = dashboard(summary(10,2));
  assert.equal(normalizedMetric(positive.country,"claims",buildRegionalReferences([positive,positive],"claims").country),50);
  assert.equal(buildRegionalReferences([],"claims").country.maximum,null);
});

test("nearby raw totals produce nearby scores, ties agree, and actual gaps affect standardization", () => {
  const values=[163,379,399], rows=values.map(n=>dashboard(summary(n,n)));
  const refs=buildRegionalReferences(rows,"claims");
  const scores=rows.map(row=>normalizedMetric(row.country,"claims",refs.country)!);
  assert.ok(scores[0] > 7 && scores[0] < 9);
  assert.ok(scores[1] > 72 && scores[1] < 74);
  assert.ok(scores[2] > 78 && scores[2] < 80);
  assert.ok(scores[2]-scores[1] < 7);
  const changed=[163,379,1000000].map(n=>dashboard(summary(n,n)));
  const changedRefs=buildRegionalReferences(changed,"claims");
  assert.ok(normalizedMetric(changed[1].country,"claims",changedRefs.country)! < 50);
  const tied=[10,20,20,1000].map(n=>dashboard(summary(n,n)));
  const tiedRefs=buildRegionalReferences(tied,"claims");
  assert.equal(normalizedMetric(tied[1].country,"claims",tiedRefs.country),normalizedMetric(tied[2].country,"claims",tiedRefs.country));
  assert.equal(normalizedMetric(summary(30,0),"claims",refs.country),null);
});

test("the raw regional mean maps to 50 and a fixed full-region reference survives display filtering", () => {
  const rows=[10,20,30].map(n=>dashboard(summary(n,n)));
  const refs=buildRegionalReferences(rows,"claims");
  assert.equal(normalizedMetric(rows[1].country,"claims",refs.country),50);
  const before=rows.map(row=>normalizedMetric(row.country,"claims",refs.country));
  const displayed=rows.slice(1).map(row=>normalizedMetric(row.country,"claims",refs.country));
  assert.deepEqual(displayed,before.slice(1));
  for (const invalid of [null, NaN, Infinity, -1]) {
    assert.equal(normalizedMetric(rows[0].country,"claims",{...refs.country,standardDeviation:invalid}),null);
  }
});

test("claim-point references exclude unresolved scores and use the point total rather than claim counts", () => {
  const rows=[dashboard(summary(10,2)),dashboard(summary(20,6)),dashboard(summary(30,99))];
  rows[2].country.claimScore.complete=false;
  const refs=buildRegionalReferences(rows,"claim_points");
  assert.deepEqual(refs.country.values,[4,12]);
  assert.equal(refs.country.mean,8);
  approximately(normalizedMetric(rows[1].country,"claim_points",refs.country),84.13447460685429);
  assert.equal(normalizedMetric(rows[2].country,"claim_points",refs.country),null);
});

test("color bands use raw population SD with precise boundaries and handle no spread", () => {
  const reference=regionalReference([0,20],2); // Mean 10, SD 10.
  assert.deepEqual([-10,0,10,20,30].map(value=>deviationBand(value,reference).tone),["below-2","neutral","neutral","neutral","above-2"]);
  assert.equal(deviationBand(-5,reference).tone,"below-1");
  assert.equal(deviationBand(25,reference).tone,"above-1");
  assert.equal(deviationBand(0,regionalReference([0,0],2)).label,"Equal regional totals");
  assert.equal(deviationBand(null,reference).label,"Comparison unavailable");
  assert.equal(deviationBand(null,reference).tone,"unavailable");
  assert.equal(deviationBand(0,regionalReference([0,0],2)).tone,"neutral");
  assert.equal(parseDashboardMetric(undefined),"claim_points");
});

test("score eligibility requires source-matched topic assessment as well as complete processing", () => {
  const a = dashboard(summary(10,2)), b = dashboard(summary(20,4));
  b.country.score.complete = false;
  const refs = buildRegionalReferences([a,b],"detail");
  assert.equal(refs.country.countries,1);
  assert.equal(normalizedMetric(b.country,"detail",refs.country),null);
});
