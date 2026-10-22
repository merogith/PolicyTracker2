import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FindingEvidence } from "./claim-details";
import type { Unit } from "@/lib/topic-merge";

test("expanded evidence shows copied quotations and figures once while retaining additional evidence", () => {
  const quote={id:"quote-1",documentId:"KAZ-NDC2",page:7,quote:"A distinct source quotation.",verified:true};
  const extra={...quote,id:"quote-2",page:8,quote:"Additional evidence from the combined statement."};
  const figure={label:"Target coverage",value_as_stated:"60%",unit:"percent",period:"2029",conditionality:"conditional"};
  const unit:Unit={
    domainId:"energy",domainLabel:"Energy",path:"findings.1",kind:"commitment",
    title:"Gasification target",text:"The full statement.",topics:[],figures:[figure],citations:[quote,extra],
    supportingFindings:[{id:"finding-1",documentId:quote.documentId,title:"Gasification target",text:"The full statement.",kind:"commitment",figures:[figure],citations:[quote]}],
  };
  const html=renderToStaticMarkup(createElement(FindingEvidence,{unit,iso3:"KAZ"}));
  assert.equal(html.split(quote.quote).length-1,1);
  assert.equal(html.split("Target coverage").length-1,1);
  assert.match(html,/Additional evidence from the combined statement/);
  assert.match(html,/2029/);
  assert.match(html,/Conditional/);
  assert.doesNotMatch(html,/The full statement/);
  assert.equal(unit.citations.length,2);
  assert.equal(unit.supportingFindings?.[0].citations.length,1);
});

test("the same quotation on different source pages remains separately accessible", () => {
  const citations=[7,8].map(page=>({id:`q-${page}`,documentId:"KAZ-NDC2",page,quote:"A shared quotation.",verified:true}));
  const unit:Unit={
    domainId:"energy",domainLabel:"Energy",path:"findings.1",kind:"commitment",text:"Combined statement.",topics:[],citations,
    supportingFindings:citations.map((quote,i)=>({id:`finding-${i}`,documentId:quote.documentId,text:`Distinct source finding ${i}.`,kind:"commitment",figures:[],citations:[quote]})),
  };
  const html=renderToStaticMarkup(createElement(FindingEvidence,{unit,iso3:"KAZ"}));
  assert.match(html,/Distinct source finding 0/);
  assert.match(html,/Distinct source finding 1/);
  assert.match(html,/page=7/);
  assert.match(html,/page=8/);
});
