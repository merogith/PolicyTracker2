import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentationOverview } from "./documentation-dashboard";
import { CountryDomainMatrix } from "./country-matrix";
import { buildDocumentationDashboard } from "../../lib/documentation-score";
import type { CountryTopics } from "../../lib/topics";
import type { CountryOverview } from "../../lib/overview";
import type { MergedItem } from "../../lib/topic-merge";
import type { DashboardMetric } from "../../lib/dashboard-metrics";
import { presentedScore } from "./score-presentation";

test("all presented /100 scores are whole numbers without changing stored precision", () => {
  assert.equal(presentedScore(49.841, "detail", false, "/100"), "50");
  assert.equal(presentedScore(50, "detail", false, "/100"), "50");
  assert.equal(presentedScore(74.9999, "detail", false, "/100"), "75");
  assert.equal(presentedScore(100, "detail", false, "/100"), "100");
  assert.equal(presentedScore(null, "detail", false, "/100"), "—");
  assert.equal(presentedScore(49.841, "detail", true, "/100"), "50");
  assert.equal(presentedScore(16.388, "claim_points", true, "/100"), "16");
  assert.equal(presentedScore(0, "claim_points", true, "/100"), "0");
});

function fixture(action = true, complete = true) {
  const domain = { id: "D", label: "Example domain", enabled: true };
  const topics = ["A", "B", "C"].map(id => ({ id, label: id, placements: [{ domain: "D" }] }));
  const claim = (kind: string, topic: string): MergedItem => ({
    units: [{ kind, topics: [topic], domainId: "D", domainLabel: "Example", path: kind, text: kind,
      citations: [{ id: kind, documentId: "DOC", page: 1, quote: kind, verified: true }] }],
    topics: [topic], stage: null, documents: ["DOC"],
  });
  const actions = action ? [...Array.from({ length: 10 }, () => claim("commitment", "A")), claim("delivered", "A")] : [];
  const input = {
    tax: { domains: [domain], topics }, ready: true, outdated: 0, retagPending: 0, untagged: [],
    topics: topics.map(topic => ({ topic, items: topic.id === "A" ? actions : topic.id === "B" ? [claim("concern", "B")] : [] })),
  } as unknown as CountryTopics;
  const processing = {
    documents: [{ id: "DOC" }], pages: { unreadable: 0 },
    coverage: [{ domain, summaryStatus: complete ? "done" : "pending", cells: [{ documentId: "DOC", status: "found" }] }],
  } as unknown as CountryOverview;
  return buildDocumentationDashboard(input, processing);
}
function render(dashboard = fixture(), metric: DashboardMetric = "detail") {
  return renderToStaticMarkup(createElement(DocumentationOverview, { dashboard, prefixes: {}, iso3: "TST", metric }))
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

test("the overview displays rounded scores with a compact breakdown and exact bands in details", () => {
  const text = render();
  assert.match(text, /Average action stage/);
  assert.match(text, /32\s+\/100/);
  assert.match(text, /1\/3 topics scored/);
  assert.match(text, /Topics by score/);
  assert.match(text, /Lower scores/);
  assert.match(text, /25–&lt;50/);
  assert.match(text, /No action documented/);
  assert.doesNotMatch(text, /\/4\b|Topics by documentation level|highest documented|Provisional/);
});
test("no-action and unfinished assessments remain distinct in the overview", () => {
  const noAction = render(fixture(false));
  assert.match(noAction, /No action documented/);
  assert.match(noAction, /0\/3 topics scored/);
  assert.doesNotMatch(noAction, /Provisional|0\s+\/100/);
  const unfinished = render(fixture(true, false));
  assert.match(unfinished, /32\s+\/100/);
  assert.match(unfinished, /Provisional/);
  assert.match(unfinished, /Not assessed/);
});
test("the existing claim-points headline still shows the same sum", () => {
  const text = render(fixture(), "claim_points");
  assert.match(text, /14\s+pts/);
  assert.match(text, /12\/12 claims scored/);
  assert.match(text, /Claims by stage/);
});

test("the main panel keeps technical statistics behind Details and preserves score precision", () => {
  const dashboard=fixture();
  const value=dashboard.country.score.value;
  const html=renderToStaticMarkup(createElement(DocumentationOverview,{dashboard,prefixes:{},iso3:"TST",metric:"claim_points"}));
  const panel=html.split('aria-label="Country documentation overview"')[1].split("</section>")[0];
  const main=panel.split('<details class="border-t border-border')[0].replace(/<[^>]*>/g," ");
  assert.doesNotMatch(main,/Share of all|each track|points ·|Regional average:|Within 1 SD|claims scored|Non-action · 0/);
  assert.match(panel,/>Details<\/summary>/);
  assert.match(panel,/12\/12 claims scored/);
  assert.match(main,/Claims by stage/);
  assert.equal(dashboard.country.score.value,value);
});

test("the breakdown follows the selected measure", () => {
  const coverage=render(fixture(),"coverage");
  assert.match(coverage,/With action claims/);
  assert.match(coverage,/Context only/);
  assert.match(coverage,/No claims found/);
  assert.doesNotMatch(coverage,/Topics by score|Claims by stage/);
  const actions=render(fixture(),"actions");
  assert.match(actions,/Selected action claims/);
  assert.match(actions,/Other claims/);
  assert.doesNotMatch(actions,/Topics by score|Claims by stage/);
});

test("coverage is rounded in the overview and comparison matrix without changing underlying percentages", () => {
  const dashboard = fixture();
  const domain = { id: "D", label: "Example domain", enabled: true, prefix: "D", definition: "", groups: [], searchHints: [], maxResults: 10, order: 0, version: 1 };
  for (const [metric, rounded] of [["coverage", "67"], ["responses", "33"]] as const) {
    assert.match(render(dashboard, metric), new RegExp(`${rounded}\\s*%`));
    const html = renderToStaticMarkup(createElement(CountryDomainMatrix, {
      rows: [{ iso3: "TST", name: "Example country", documents: 1, dashboard }], domains: [domain], mode: metric,
    }));
    assert.match(html, new RegExp(`Example country, Example domain: ${rounded}%`));
    assert.match(html, new RegExp(`tabular">${rounded}</span>`));
    assert.doesNotMatch(html, /\b(?:66\.7|33\.3)%/);
  }
  assert.equal(dashboard.country.coveragePercent, 100 * 2 / 3);
  assert.equal(dashboard.country.responseCoveragePercent, 100 / 3);
});
