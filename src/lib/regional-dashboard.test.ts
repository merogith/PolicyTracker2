import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDocumentationDashboard } from "./documentation-score";
import { buildCohortKey, buildResponseStages, compareCohort, summarizeRegion, type CohortObservation, type RegionalCountry } from "./regional-dashboard";
import type { CountryOverview } from "./overview";
import type { CountryTopics } from "./topics";
import type { MergedItem } from "./topic-merge";

function group(kinds: Array<string | null>, topics: string[]): MergedItem {
  return {
    topics, stage: 4, documents: ["DOC"], // Deliberately misleading legacy maximum.
    units: kinds.map((kind) => ({ kind, topics, domainId: "A", domainLabel: "Water", path: "findings.0", text: "Fixture", citations: [] })),
  };
}

function country(iso3 = "AAA", demo = false): RegionalCountry {
  const shared = group(["planned_action"], ["A-1", "B-1"]);
  const context = group(["concern"], ["A-2"]);
  const domains = [{ id: "A", label: "Water", enabled: true }, { id: "B", label: "Agriculture", enabled: true }];
  const taxTopics = [
    { id: "A-1", label: "Water security", placements: [{ domain: "A" }] },
    { id: "A-2", label: "Water risk", placements: [{ domain: "A" }] },
    { id: "B-1", label: "Irrigation", placements: [{ domain: "B" }] },
  ];
  const topics = {
    tax: { domains, topics: taxTopics }, ready: true, hasDemoResults: demo, outdated: 0, retagPending: 0,
    topics: taxTopics.map((topic) => ({ topic, items: topic.id === "A-2" ? [context] : [shared] })),
    untagged: [],
  } as unknown as CountryTopics;
  const overview = {
    documents: [{ id: "DOC", kind: "NDC" }], pages: { read: 10, unreadable: 0 }, activeJobs: 0,
    summariesDone: 2, summariesTotal: 2,
    coverage: domains.map((domain) => ({ domain, summaryStatus: "done", cells: [{ documentId: "DOC", status: "found", items: 1 }] })),
  } as unknown as CountryOverview;
  return { iso3, name: iso3, topics, overview, dashboard: buildDocumentationDashboard(topics, overview) };
}

test("reported stages use member agreement, preserve mixed groups and deduplicate topic placements", () => {
  const row = country();
  row.topics.untagged = [
    group(["commitment"], []), group(["underway", "underway"], []), group(["delivered"], []),
    group(["planned_action", "delivered"], []), group(["concern", "underway"], []),
    group([null, "commitment"], []), group(["other"], []),
  ];
  assert.deepEqual(buildResponseStages(row.topics), {
    commitment: 1, planned: 1, underway: 1, delivered: 1, mixed: 3, other: 2, total: 9,
  });
});

test("stages exclude groups whose only home topic is in a disabled domain", () => {
  const row = country();
  row.topics.tax.domains[1].enabled = false;
  row.topics.topics = row.topics.topics.map((topic) => topic.topic.id === "B-1" ? { ...topic, items: [group(["delivered"], ["B-1"])] } : topic);
  assert.equal(buildResponseStages(row.topics).total, 2);
  assert.equal(buildResponseStages(row.topics).delivered, 0);
});

test("regional inventories exclude demo countries from every observed measure", () => {
  const actual = country();
  const emptyTopic = { id: "A-3", label: "Water monitoring", placements: [{ domain: "A" }] };
  actual.topics.tax.topics.push(emptyTopic as typeof actual.topics.tax.topics[number]);
  actual.topics.topics.push({ topic: emptyTopic, items: [] } as unknown as typeof actual.topics.topics[number]);
  actual.dashboard = buildDocumentationDashboard(actual.topics, actual.overview);
  const demo = country("DEMO", true);
  demo.overview.documents.push(demo.overview.documents[0]);
  const summary = summarizeRegion([actual, demo]);
  assert.equal(summary.totalCountries, 2);
  assert.equal(summary.countries, 1);
  assert.equal(summary.demoCountries, 1);
  assert.equal(summary.analyzedCountries, 1);
  assert.equal(summary.completeCountries, 1);
  assert.equal(summary.documents, 1);
  assert.equal(summary.findings, 2);
  assert.equal(summary.responses, 1);
  assert.equal(summary.context, 1);
  assert.equal(summary.topicObservations, 4);
  assert.equal(summary.topicsWithResponses, 2);
  assert.equal(summary.topicsWithoutAction, 2);
  assert.equal(summary.responseCoveragePercent, 50);
  assert.equal(summary.stages.total, 2);
  assert.deepEqual(summary.topicSignals.find((row) => row.id === "A-2"), {
    id: "A-2", label: "Water risk", countriesWithResponses: 0, countriesWithoutAction: 1,
    countriesObserved: 1, countriesProcessed: 1,
  });
  assert.equal(actual.dashboard.topics.find((topic) => topic.id === "A-3")?.score.value, null);
  assert.equal(actual.dashboard.topics.find((topic) => topic.id === "A-3")?.score.noActionTopics, 1);
  assert.equal(summary.topicSignals.find((topic) => topic.id === "A-3")?.countriesWithoutAction, 1);
  assert.equal(summary.topicSignals.find((topic) => topic.id === "A-1")?.countriesWithoutAction, 0);
  assert.equal(summary.domainSignals.find((row) => row.id === "A")?.countriesWithResponses, 1);
});

test("all zero-point statement types count as no action until an action claim is present", () => {
  const row = country();
  const topic = row.topics.topics.find((topic) => topic.topic.id === "A-2")!;
  for (const kind of ["concern", "context", "result_reported", "projection", "proposal", "other"]) {
    const claim = group([kind], ["A-2"]);
    claim.units[0].citations = [{ id: "C", documentId: "DOC", page: 1, quote: "Fixture", verified: true }];
    topic.items.splice(0, topic.items.length, claim);
    row.dashboard = buildDocumentationDashboard(row.topics, row.overview);
    assert.equal(row.dashboard.topics.find((topic) => topic.id === "A-2")?.claimScore.value, 0, kind);
    assert.equal(summarizeRegion([row]).topicsWithoutAction, 1, kind);

    topic.items.push(group(["commitment"], ["A-2"]));
    row.dashboard = buildDocumentationDashboard(row.topics, row.overview);
    assert.equal(summarizeRegion([row]).topicsWithoutAction, 0, `${kind} with an action`);
  }
});

test("partial evidence stays observed but does not enter complete processing counts", () => {
  const row = country();
  row.overview.pages.unreadable = 1;
  row.dashboard = buildDocumentationDashboard(row.topics, row.overview);
  const summary = summarizeRegion([row]);
  assert.equal(summary.responses, 1);
  assert.equal(summary.partialCountries, 1);
  assert.equal(summary.completeCountries, 0);
  assert.ok(summary.topicSignals.every((topic) => topic.countriesObserved === 1 && topic.countriesProcessed === 0));
});

test("an unanalysed inventory does not imply zero response coverage", () => {
  const row = country();
  row.topics.ready = false;
  row.topics.topics = row.topics.topics.map((topic) => ({ ...topic, items: [] }));
  row.dashboard = buildDocumentationDashboard(row.topics, row.overview);
  const summary = summarizeRegion([row]);
  assert.equal(summary.analyzedCountries, 0);
  assert.equal(summary.unanalysedCountries, 1);
  assert.equal(summary.topicObservations, 0);
  assert.equal(summary.responseCoveragePercent, null);
  assert.equal(summary.topicsWithoutAction, 3);
  assert.ok(row.dashboard.topics.every((topic) => topic.score.value === null));
  assert.ok(summary.topicSignals.every((topic) => topic.countriesWithoutAction === 1));
  assert.ok(summary.topicSignals.every((topic) => topic.countriesObserved === 0));
});

const observation = (iso3: string, value: number | null, overrides: Partial<CohortObservation> = {}): CohortObservation =>
  ({ iso3, value, cohortKey: "same-profile", demo: false, complete: true, ...overrides });

test("a single real eligible country cannot establish a regional benchmark", () => {
  const result = compareCohort([
    observation("AAA", 70), observation("BBB", 80, { demo: true }),
    observation("CCC", 10, { complete: false }), observation("DDD", 20, { cohortKey: "different-profile" }),
    observation("EEE", null), observation("FFF", NaN),
  ], "same-profile");
  assert.equal(result.n, 1);
  assert.equal(result.mean, null);
  assert.equal(result.standardDeviation, null);
  assert.deepEqual(result.comparisons, [{ iso3: "AAA", value: 70, delta: null, zScore: null }]);
  assert.equal(result.excluded, 5);
});

test("a compatible cohort computes descriptive population SD and raw differences", () => {
  const result = compareCohort([observation("AAA", 50), observation("BBB", 70)], "same-profile");
  assert.equal(result.n, 2);
  assert.equal(result.mean, 60);
  assert.equal(result.standardDeviation, 10);
  assert.deepEqual(result.comparisons.map((row) => [row.delta, row.zScore]), [[-10, -1], [10, 1]]);
});

test("equal cohort values have zero difference but no undefined standardized score", () => {
  const result = compareCohort([observation("AAA", 70), observation("BBB", 70)], "same-profile");
  assert.equal(result.mean, 70);
  assert.equal(result.standardDeviation, 0);
  assert.ok(result.comparisons.every((row) => row.delta === 0 && row.zScore === null));
});

test("repeated or conflicting country rows cannot manufacture a regional cohort", () => {
  const repeated = compareCohort([observation("AAA", 70), observation("AAA", 70)], "same-profile");
  assert.equal(repeated.n, 1);
  assert.equal(repeated.mean, null);
  const conflicting = compareCohort([observation("AAA", 70), observation("AAA", 80), observation("BBB", 40)], "same-profile");
  assert.equal(conflicting.n, 1);
  assert.equal(conflicting.mean, null);
});

test("cohort keys preserve source inventory, method, taxonomy and scope while ignoring input order", () => {
  const base = { documentKinds: ["NAP", "NDC"], taxonomyVersion: "2", methodVersion: "1", scope: "response-coverage" };
  const key = buildCohortKey(base);
  assert.equal(key, buildCohortKey({ ...base, documentKinds: ["NDC", "NAP"] }));
  assert.notEqual(key, buildCohortKey({ ...base, documentKinds: ["NAP", "NDC", "NDC"] }));
  assert.notEqual(key, buildCohortKey({ ...base, taxonomyVersion: "3" }));
  assert.notEqual(key, buildCohortKey({ ...base, methodVersion: "2" }));
  assert.notEqual(key, buildCohortKey({ ...base, scope: "Water" }));
  assert.notEqual(key, buildCohortKey({ ...base, sourceWindow: "2020–2025" }));
});
