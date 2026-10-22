import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardSelection } from "./dashboard-metrics";

test("new dashboards open normalized claim points", () => {
  assert.deepEqual(dashboardSelection(undefined, undefined), { metric: "claim_points", scale: "normalized" });
});

test("bookmarked measures and explicit scales preserve their meaning", () => {
  assert.deepEqual(dashboardSelection("detail", "normalized"), { metric: "detail", scale: "normalized" });
  assert.deepEqual(dashboardSelection("claim_points", "raw"), { metric: "claim_points", scale: "raw" });
  assert.deepEqual(dashboardSelection("detail", undefined), { metric: "detail", scale: "raw" });
  assert.deepEqual(dashboardSelection(undefined, "raw"), { metric: "claim_points", scale: "raw" });
  assert.deepEqual(dashboardSelection("score", "normalized"), { metric: "detail", scale: "normalized" });
});

test("coverage and legacy action coverage stay unnormalized", () => {
  for (const metric of ["coverage", "responses"]) {
    assert.deepEqual(dashboardSelection(metric, "normalized"), { metric, scale: "raw" });
  }
});
