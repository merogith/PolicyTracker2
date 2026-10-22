import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonBars, DistributionBars } from "./comparison-bars";

test("topic bars show the fixed inventory share, not a percentage of the largest category", () => {
  const html = renderToStaticMarkup(createElement(DistributionBars, {
    total: 64, unit: "topics",
    rows: [{label:"Implementation reported",value:44},{label:"Not assessed",value:20}],
  }));
  assert.match(html, /69%/);
  assert.match(html, /width:68\.75%/);
  assert.match(html, /width:31\.25%/);
  assert.match(html, /Not assessed/);
});

test("empty inventories and unavailable observations stay distinct from measured zero", () => {
  const empty = renderToStaticMarkup(createElement(DistributionBars, {total:0,unit:"topics",rows:[{label:"No evidence found",value:0}]}));
  assert.doesNotMatch(empty, /NaN|Infinity/);
  assert.match(empty, /No topics to display/);
  const chart = renderToStaticMarkup(createElement(ComparisonBars, {
    rows: [{id:"A",label:"Pending",value:null,href:"/countries/A"},{id:"B",label:"Assessed",value:0,href:"/countries/B"}],
    maximum:100,average:null,unit:"/100",
  }));
  assert.match(chart, /Not assessed/);
  assert.match(chart, />0\/100</);
  assert.equal((chart.match(/width:0%/g)??[]).length, 1);
  assert.match(chart, /Average unavailable/);
});
