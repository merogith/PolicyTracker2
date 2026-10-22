import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDocumentationDashboard, documentationBand } from "./documentation-score";
import type { CountryOverview } from "./overview";
import type { CountryTopics } from "./topics";
import type { MergedItem, Unit } from "./topic-merge";

function unit(kind: string | null, topics: string[]): Unit {
  return { kind, topics, domainId: "A", domainLabel: "Water", path: "findings.0", text: "Fixture statement", citations: [] };
}

function fixture() {
  const shared: MergedItem = { units: [unit("planned_action", ["A-1", "B-1"])], topics: ["A-1", "B-1"], stage: 2, documents: ["D1"] };
  const context: MergedItem = { units: [unit("concern", ["A-2"])], topics: ["A-2"], stage: 0, documents: ["D1"] };
  const untagged: MergedItem = { units: [unit("other", [])], topics: [], stage: null, documents: ["D1"] };
  const domains = [{ id: "A", label: "Water", enabled: true }, { id: "B", label: "Agriculture", enabled: true }];
  const topics = [
    { id: "A-1", label: "Water security", placements: [{ domain: "A" }, { domain: "B" }] },
    { id: "A-2", label: "Water risk", placements: [{ domain: "A" }] },
    { id: "A-3", label: "Water services", placements: [{ domain: "A" }] },
    { id: "B-1", label: "Irrigation", placements: [{ domain: "B" }] },
  ];
  const input = {
    tax: { domains, topics },
    topics: topics.map((topic) => ({ topic, items: topic.id === "A-1" || topic.id === "B-1" ? [shared] : topic.id === "A-2" ? [context] : [] })),
    untagged: [untagged], ready: true, outdated: 0, retagPending: 0,
  } as unknown as CountryTopics;
  const processing = {
    documents: [{ id: "D1" }], pages: { read: 10, unreadable: 0 }, activeJobs: 0,
    summariesDone: 2, summariesTotal: 2,
    coverage: domains.map((domain) => ({ domain, summaryStatus: "done", cells: [{ documentId: "D1", status: "found", items: 1 }] })),
  } as unknown as CountryOverview;
  return { input, processing };
}

test("counts shared groups once nationally; home topics control the denominator", () => {
  const { input, processing } = fixture();
  const result = buildDocumentationDashboard(input, processing);
  assert.equal(result.country.findings, 3); // Shared response, concern, untagged context.
  assert.equal(result.country.responses, 1);
  assert.equal(result.country.context, 2);
  assert.equal(result.country.topicsAddressed, 3);
  assert.equal(result.country.topicsWithResponses, 2);
  assert.equal(result.country.coveragePercent, 75); // Not mean(2/3, 1/1).
  assert.equal(result.country.responseCoveragePercent, 50);
  assert.deepEqual(result.domains.map((domain) => domain.topicCount), [3, 1]);
  assert.deepEqual(result.domains.map((domain) => domain.findings), [2, 1]);
});

test("a response member does not turn another topic's context into a documented response", () => {
  const { input, processing } = fixture();
  const shared = input.topics.find((row) => row.topic.id === "A-1")!.items[0];
  shared.units = [unit("concern", ["A-1"]), unit("planned_action", ["B-1"])];
  const result = buildDocumentationDashboard(input, processing);
  assert.equal(result.country.responses, 1);
  assert.equal(result.country.topicsWithResponses, 1);
  assert.equal(result.country.responseCoveragePercent, 25);
  assert.equal(result.topics.find((row) => row.id === "A-1")!.responses, 0);
  assert.equal(result.topics.find((row) => row.id === "A-1")!.context, 1);
  assert.equal(result.topics.find((row) => row.id === "B-1")!.responses, 1);
  assert.deepEqual(result.domains.map((row) => row.responses), [0, 1]);
});

test("disabled home domains do not leave hidden topics in the dashboard denominator", () => {
  const { input, processing } = fixture();
  input.tax.domains[1].enabled = false;
  processing.coverage = processing.coverage.filter((row) => row.domain.id === "A");
  processing.summariesDone = 1;
  processing.summariesTotal = 1;
  const result = buildDocumentationDashboard(input, processing);
  assert.deepEqual(result.domains.map((row) => row.id), ["A"]);
  assert.deepEqual(result.topics.map((row) => row.id), ["A-1", "A-2", "A-3"]);
  assert.equal(result.country.topicCount, 3);
  assert.equal(result.country.topicsAddressed, 2);
  assert.equal(result.country.coveragePercent, 200 / 3);
  assert.equal(result.country.processingComplete, true);
});

test("finished legacy processing never invents a four-check score or a trend", () => {
  const { input, processing } = fixture();
  const result = buildDocumentationDashboard(input, processing);
  assert.equal(result.country.processingComplete, true);
  for (const row of [result.country, ...result.domains, ...result.topics]) {
    assert.equal(row.detail.score, null);
    assert.equal(row.detail.label, "Assessment unavailable");
    assert.equal(row.change.symbol, "—");
    assert.equal(row.countsProvisional, true);
  }
});

test("demonstration results are explicit and cannot establish a complete assessment", () => {
  const { input, processing } = fixture();
  const result = buildDocumentationDashboard({ ...input, hasDemoResults: true }, processing);
  assert.equal(result.demo, true);
  assert.equal(result.country.findings, 3);
  assert.equal(result.country.coveragePercent, 75);
  assert.equal(result.country.processingComplete, false);
  assert.equal(result.country.detail.score, null);
  assert.ok(result.domains.every((domain) => !domain.processingComplete));
});

test("pending source processing preserves observed coverage and cannot establish absence", () => {
  const { input, processing } = fixture();
  processing.coverage[0].cells[0].status = "pending";
  const result = buildDocumentationDashboard(input, processing);
  assert.equal(result.country.processingComplete, false);
  assert.equal(result.country.processedTopics, 1);
  assert.equal(result.country.coveragePercent, 75);
  assert.equal(result.topics.find((topic) => topic.id === "A-3")!.detail.score, null);
});

test("unreadable pages, unfinished summaries or stale tags block a complete assessment", () => {
  for (const incomplete of ["pages", "summaries", "tags"] as const) {
    const { input, processing } = fixture();
    if (incomplete === "pages") processing.pages.unreadable = 1;
    if (incomplete === "summaries") processing.coverage[0].summaryStatus = "pending";
    if (incomplete === "tags") input.retagPending = 1;
    const result = buildDocumentationDashboard(input, processing);
    assert.equal(result.country.processingComplete, false, incomplete);
    assert.equal(result.country.detail.score, null, incomplete);
    if (incomplete === "tags") assert.equal(result.country.processedTopics, 0);
  }
});

test("missing processing information and a country without results do not produce false zeros", () => {
  const { input } = fixture();
  assert.equal(buildDocumentationDashboard(input).country.processingComplete, false);
  input.ready = false;
  input.topics = input.topics.map((topic) => ({ ...topic, items: [] }));
  input.untagged = [];
  const country = buildDocumentationDashboard(input).country;
  assert.equal(country.coveragePercent, null);
  assert.equal(country.detail.score, null);
  assert.equal(country.findings, 0);
});

test("an empty topic inventory remains unavailable rather than NaN or a perfect score", () => {
  const { input, processing } = fixture();
  input.tax.topics = [];
  input.topics = [];
  input.untagged = [];
  const country = buildDocumentationDashboard(input, processing).country;
  assert.equal(country.coveragePercent, null);
  assert.equal(country.processingComplete, false);
});

test("score bands follow the five stage anchors and reject invalid numbers", () => {
  assert.equal(documentationBand(24.99).label, "0–<25");
  assert.equal(documentationBand(25).label, "25–<50");
  assert.equal(documentationBand(50).label, "50–<75");
  assert.equal(documentationBand(75).label, "75–<100");
  assert.equal(documentationBand(100).tone, "high");
  assert.deepEqual([0,24.99,25,49.99,50,74.99,75,99.99,100].map(value=>documentationBand(value).tone),
    ["low","low","mid-low","mid-low","mid","mid","mid-high","mid-high","high"]);
  for (const score of [null, NaN, Infinity, -1, 101]) assert.equal(documentationBand(score).tone, "unavailable");
});

test("custom action selection changes counts without changing score or default response semantics", () => {
  const { input, processing } = fixture();
  const standard = buildDocumentationDashboard(input, processing);
  const planned = buildDocumentationDashboard(input, processing, [2]);
  const implemented = buildDocumentationDashboard(input, processing, [3,4]);
  const concern = buildDocumentationDashboard(input, processing, [0]);
  const none = buildDocumentationDashboard(input, processing, []);
  assert.equal(standard.country.actions, standard.country.responses);
  assert.equal(planned.country.actions, 1);
  assert.equal(implemented.country.actions, 0);
  assert.equal(concern.country.actions, 2); // Level 0 now includes Other as well as Concern.
  assert.equal(none.country.actions, 0);
  assert.deepEqual(planned.domains.map(d => d.actions), [1,1]);
  assert.deepEqual(implemented.country.score, standard.country.score);
  assert.equal(implemented.country.responses, standard.country.responses);
});

test("a ready country cannot turn failed, pending or missing empty domains into zero coverage", () => {
  for (const status of ["failed", "pending", "missing"] as const) {
    const { input, processing } = fixture();
    input.topics = input.topics.map(row => row.topic.id === "B-1" ? { ...row, items: [] } : row);
    processing.coverage[1].cells[0].status = status;
    const result = buildDocumentationDashboard(input, processing);
    const domain = result.domains.find(d => d.id === "B")!;
    assert.equal(domain.coveragePercent, null, status);
    assert.equal(domain.responseCoveragePercent, null, status);
    assert.equal(domain.processingState, status === "missing" ? "unavailable" : status);
    assert.ok(result.domains[0].coveragePercent! > 0);
  }
});

test("completed empty domains show zero; failures with observed evidence retain provisional coverage", () => {
  const { input, processing } = fixture();
  processing.coverage[0].cells[0].status = "failed";
  const partial = buildDocumentationDashboard(input, processing).domains[0];
  assert.equal(partial.coveragePercent, 200 / 3);
  assert.equal(partial.processingState, "failed");
  assert.equal(partial.processingComplete, false);
  processing.coverage[0].cells[0].status = "found";
  processing.coverage[1].cells[0].status = "not_found";
  input.topics = input.topics.map(row => row.topic.id === "B-1" ? { ...row, items: [] } : row);
  const empty = buildDocumentationDashboard(input, processing).domains[1];
  assert.equal(empty.coveragePercent, 0);
  assert.equal(empty.processingState, "complete");
});

test("completed domains remain complete when another domain fails or queues its summary", () => {
  for (const status of ["failed", "pending", "missing"] as const) {
    const { input, processing } = fixture();
    input.topics[3].items.splice(0);
    processing.coverage[1].cells[0].status = "not_found";
    processing.coverage[0].summaryStatus = status;
    processing.activeJobs = status === "pending" ? 1 : 0;
    processing.summariesDone = 1;
    const result = buildDocumentationDashboard(input, processing);
    assert.equal(result.country.processingComplete, false);
    assert.equal(result.domains[0].processingComplete, false);
    assert.equal(result.domains[1].processingComplete, true);
    assert.equal(result.domains[1].coveragePercent, 0);
    assert.equal(result.domains[1].processingState, "complete");
  }
});

test("action-stage scores use distinct topic claims while claim sums and action filters keep their behavior", () => {
  const { input, processing } = fixture();
  for (const item of new Set(input.topics.flatMap(row => row.items))) {
    for (const member of item.units) member.citations = [{ id:"c",documentId:"D1",page:1,quote:"Fixture statement",verified:true }];
  }
  const extra=unit("delivered",["A-1"]);
  extra.citations=[{id:"extra",documentId:"D1",page:1,quote:"Fixture statement",verified:true}];
  input.topics[0].items.push({units:[extra],topics:["A-1"],documents:["D1"],stage:4});
  const standard=buildDocumentationDashboard(input,processing);
  const filtered=buildDocumentationDashboard(input,processing,[]);
  assert.equal(standard.topics[0].score.value,75); // Plan (50) and delivery (100).
  assert.equal(standard.topics[3].score.value,50); // The shared plan only.
  assert.equal(standard.country.score.value,62.5); // Equal topic weighting, not a pooled claim mean.
  assert.equal(standard.country.score.scoredTopics,2);
  assert.equal(standard.country.score.noActionTopics,2);
  assert.equal(standard.topics[0].claimScore.value,6);
  assert.equal(standard.country.claimScore.value,6);
  assert.deepEqual(filtered.country.score,standard.country.score);
  assert.deepEqual(filtered.country.claimScore,standard.country.claimScore);
  assert.equal(filtered.country.actions,0);
});

test("old saved dashboards receive only the new documentation metric from their frozen claims", () => {
  const { input, processing } = fixture();
  for (const item of new Set(input.topics.flatMap(row => row.items))) {
    for (const member of item.units) member.citations = [{ id:"c",documentId:"D1",page:1,quote:"Fixture statement",verified:true }];
  }
  const expected=buildDocumentationDashboard(input,processing);
  const saved={
    ...expected,
    country:{...expected.country,score:{...expected.country.score,version:"documentation-stage-v2",value:100}},
    domains:expected.domains.map(row=>({...row,score:{...row.score,version:"documentation-stage-v2",value:100}})),
    topics:expected.topics.map(row=>({...row,score:{...row.score,version:"documentation-stage-v2",value:100}})),
  };
  const original=JSON.stringify(saved);
  input.savedDashboards={"1,2,3,4":saved};
  const refreshed=buildDocumentationDashboard(input);
  assert.deepEqual(refreshed,expected);
  assert.equal(JSON.stringify(saved),original);
  assert.equal(refreshed.country.claimScore,saved.country.claimScore);
  input.savedDashboards={"1,2,3,4":refreshed};
  assert.equal(buildDocumentationDashboard(input),refreshed);
});
