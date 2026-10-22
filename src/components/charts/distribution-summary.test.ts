import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DistributionSummary } from "./distribution-summary";

test("the compact distribution preserves the full inventory and keeps zero categories visible",()=>{
  const html=renderToStaticMarkup(createElement(DistributionSummary,{
    total:64,unit:"topics",rows:[
      {label:"Scored",value:44,color:"green"},
      {label:"Not assessed",value:20,color:"gray"},
      {label:"Top score",value:0,color:"darkgreen"},
    ],
  }));
  assert.match(html,/width:68\.75%/);
  assert.match(html,/width:31\.25%/);
  assert.equal((html.match(/width:/g)??[]).length,2);
  assert.match(html,/Top score/);
  assert.match(html,/Not assessed/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g," "),/%/);
});

test("an empty compact distribution has no fabricated percentages",()=>{
  const html=renderToStaticMarkup(createElement(DistributionSummary,{total:0,unit:"claims",rows:[]}));
  assert.match(html,/No claims to display/);
  assert.doesNotMatch(html,/width:|NaN|Infinity/);
});
