import { strict as assert } from "node:assert";
import { test } from "node:test";
import { defaultClaimView, readClaimView, writeClaimView } from "./claim-view-state";

test("a source round trip retains the entire claim view and the selected report", () => {
  const state = {
    ...defaultClaimView, search: "water & drought", domain: "water", country: "KAZ",
    topic: "water-supply", documentId: "KAZ-NDC2", stage: "commitment",
    labeling: "partial", labels: { purpose: "adaptation" }, page: 3,
    groupBy: "domain" as const, sortBy: "points" as const, descending: true,
    expanded: ["water:KAZ:water:findings.2"], includeDemo: true,
  };
  const params = writeClaimView(new URLSearchParams("tab=summary&report=saved-report"), state);
  assert.equal(params.get("report"), "saved-report");
  assert.equal(params.get("tab"), "summary");
  assert.deepEqual(readClaimView(new URLSearchParams(params.toString())), state);
});

test("clearing a claim view removes stale filters without changing navigation", () => {
  const params = writeClaimView(new URLSearchParams("view=targets&c_domain=water&c_open=old&c_page=4"), defaultClaimView);
  assert.equal(params.toString(), "view=targets");
  assert.deepEqual(readClaimView(params), defaultClaimView);
});

test("malformed page and sorting parameters fall back to a usable view", () => {
  for (const page of ["-2", "Infinity", "1.5", "x", "99999999999999999999"]) {
    const state = readClaimView(new URLSearchParams(`c_page=${page}&c_sortBy=unknown&c_groupBy=unknown`));
    assert.equal(state.page, 1);
    assert.equal(state.sortBy, "title");
    assert.equal(state.groupBy, "none");
  }
});
