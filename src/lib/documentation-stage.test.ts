import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateDocumentation, documentationEmptyLabel, statementPoints, topicDocumentationAssessment, topicDocumentationLevel } from "./documentation-stage";
import type { Unit, MergedItem } from "./topic-merge";

const unit = (kind: string, topics = ["WAT-01"], verified = true): Unit => ({kind,topics,text:"Example",domainId:"water",domainLabel:"Water",path:"findings.0",citations:[{id:"c",documentId:"D",page:1,quote:"Example",verified}]});
const group = (units: Unit[]): MergedItem => ({units,topics:units.flatMap(u=>u.topics),documents:["D"],stage:4});

test("action averages use the existing claim stage scale and require matched quotations",()=>{
  assert.deepEqual(["concern","other","commitment","planned_action","underway","delivered"].map(k=>statementPoints(unit(k))),[0,0,1,2,3,4]);
  assert.equal(statementPoints(unit("underway",["WAT-01"],false)),null);
  assert.equal(statementPoints(unit("invented_kind")),null);
});
test("topic scoring uses only its tagged members, not a group's highest legacy stage",()=>{
  const mixed=group([unit("concern"),unit("delivered",["AGR-01"])]);
  assert.equal(topicDocumentationLevel([mixed],"WAT-01",true),0);
  assert.equal(topicDocumentationLevel([mixed],"AGR-01",true),4);
});
test("a grouped claim counts once and context does not dilute the action average",()=>{
  const plan=group([unit("planned_action")]);
  const delivered=group([unit("delivered"),unit("delivered")]);
  assert.equal(topicDocumentationLevel([plan,plan,delivered,group([unit("concern")])],"WAT-01",true),3);
});
test("no-action status requires complete processing; unsupported evidence stays unknown",()=>{
  assert.equal(topicDocumentationLevel([],"WAT-01",true),0);
  assert.equal(topicDocumentationLevel([],"WAT-01",false),null);
  assert.equal(topicDocumentationLevel([group([unit("delivered",["WAT-01"],false)])],"WAT-01",true),null);
  assert.equal(topicDocumentationLevel([group([unit("concern")])],"WAT-01",false),null);
});
test("the examples distinguish commitment-heavy, delivery-heavy and mixed action topics on 100",()=>{
  for (const [kinds, expected] of [
    [[...Array(10).fill("commitment"),"delivered"], 100*14/44],
    [["commitment",...Array(10).fill("delivered")], 100*41/44],
    [["planned_action","planned_action","underway","underway"], 62.5],
  ] as [string[],number][]) {
    const level=topicDocumentationLevel(kinds.map(kind=>group([unit(kind)])),"WAT-01",true);
    const score=aggregateDocumentation([level],true);
    assert.ok(Math.abs(score.value!-expected)<1e-10);
    assert.equal(score.complete,true);
  }
});
test("unresolved or unmatched claims keep an observed average provisional",()=>{
  const known=group([unit("planned_action")]);
  for (const unresolved of [
    group([unit("commitment"),unit("delivered")]),
    group([unit("invented_kind")]),
    group([unit("delivered",["WAT-01"],false)]),
  ]) {
    assert.deepEqual(topicDocumentationAssessment([known,unresolved],"WAT-01",true),{level:2,complete:false});
    assert.deepEqual(topicDocumentationAssessment([unresolved],"WAT-01",true),{level:null,complete:false});
  }
});
test("equal topic averages exclude no-action topics and partial averages are not lower bounds",()=>{
  const all=aggregateDocumentation([1,2,3,4],true);
  assert.equal(all.value,62.5); assert.equal(all.complete,true);
  assert.deepEqual(all.distribution,[0,1,1,1,1]);
  const partial=aggregateDocumentation([4,0,null],true);
  assert.equal(partial.value,100); assert.equal(partial.assessedTopics,2); assert.equal(partial.scoredTopics,1);
  assert.equal(partial.noActionTopics,1); assert.equal(partial.totalTopics,3); assert.equal(partial.complete,false);
  assert.doesNotMatch(partial.reason,/minimum|lower bound/);
  assert.equal(aggregateDocumentation([4,0,1],true).value,62.5);
  assert.equal(aggregateDocumentation([null],false).value,null);
  assert.equal(aggregateDocumentation([],true).value,null);
  assert.equal(aggregateDocumentation([4,0],true).value,100);
  const contextOnly=aggregateDocumentation([0,0],true);
  assert.equal(contextOnly.value,null); assert.equal(contextOnly.complete,true);
  assert.equal(documentationEmptyLabel(contextOnly),"No action documented");
  assert.equal(documentationEmptyLabel(aggregateDocumentation([null],false)),"Not assessed");
});
test("fractional topic averages are placed into explicit numeric score bands",()=>{
  const scores=aggregateDocumentation([0,1,1.99,2,2.99,3,3.99,4,null],false);
  assert.deepEqual(scores.distribution,[1,2,2,2,1]);
  assert.equal(scores.distribution.reduce((a,b)=>a+b,0),scores.assessedTopics);
});
