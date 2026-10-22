import assert from "node:assert/strict";
import { test } from "node:test";
import { claimScore, sumClaimScores } from "./claim-score";
import { findingStatementType, groupStatementType, STATEMENT_TYPES, statementTypePoints } from "./statement-types";
import { mergeSourceClaims, mergeUnits, type Unit } from "./topic-merge";
import { buildDocumentationDashboard } from "./documentation-score";
import type { CountryTopics } from "./topics";
import type { CountryOverview } from "./overview";
import type { Classification } from "./labels";

const unit = (kind: string | null, topics=["A"], text="A statement"): Unit => ({
  kind, topics, text, domainId:"D",domainLabel:"Domain",path:"findings.0",
  citations:[{id:"q",documentId:"DOC",page:1,quote:"Source statement",verified:true}],
});
const classification = (type: string): Classification => ({
  statement_type:{value:type,quotes:["Source statement"]},
  labels:{purpose:[],geographic_scope:[],hazards:[],themes:[],affected_groups:[],policy_instruments:[],risk_component:[],risk_function:[]},
  facts:[],actors:[],priority:null,
});

test("each predefined type receives the requested 0–4 points, including legacy action aliases",()=>{
  assert.deepEqual(Object.fromEntries(STATEMENT_TYPES.map(type=>[type.id,claimScore([unit(type.id)]).points])),{
    concern:0,context:0,projection:0,commitment:1,planned_action:2,implementation_underway:3,output_delivered:4,result_reported:0,proposal:0,other:0,
  });
  assert.equal(claimScore([unit("underway")]).points,3);
  assert.equal(claimScore([unit("delivered")]).points,4);
  assert.equal(statementTypePoints(null),null);
  assert.equal(statementTypePoints("unknown_new_type"),null);
});

test("detailed classification corrects the conflicting legacy badge and points together",()=>{
  const u=unit("concern");
  u.classifications=[{sourceId:"source",documentId:"DOC",classification:classification("commitment")}];
  assert.equal(groupStatementType([u]),"commitment");
  assert.equal(claimScore([u]).points,1);
  u.classifications[0].classification=classification("context");
  u.kind="delivered";
  assert.equal(groupStatementType([u]),"context");
  assert.equal(claimScore([u]).points,0);
  assert.equal(findingStatementType({kind:"concern",classification:classification("commitment")}),"commitment");
});

test("conflicting types remain unresolved; quotation matching is separate from saved progression points",()=>{
  assert.equal(claimScore([unit("planned_action"),unit("delivered")]).points,null);
  assert.equal(claimScore([unit("concern"),unit("projection")]).points,0);
  const unmatched=unit("commitment");
  unmatched.classifications=[{sourceId:"source",documentId:"DOC",classification:classification("output_delivered")}];
  unmatched.classifications[0].classification.statement_type.quotes=["Different unverified statement"];
  assert.equal(claimScore([unmatched]).points,4);
  assert.equal(claimScore([unmatched]).sourceMatched,false);
  unmatched.citations[0].verified=false;
  assert.equal(claimScore([unmatched]).sourceMatched,false);
});

test("distinct assertions sharing a quotation add points, duplicate assertions and repeated tags do not",()=>{
  const plan=unit("planned_action",["A","B"],"Build flood barriers");
  const groups=mergeUnits([plan,{...plan,path:"findings.1"},unit("delivered",["A"],"Adopt the water code")]);
  assert.equal(groups.length,2);
  const total=sumClaimScores([...groups,...groups],true,true);
  assert.equal(total.value,6);
  assert.equal(total.scoredClaims,2);
  assert.deepEqual(total.distribution,[0,0,1,0,1]);
  assert.equal(claimScore([unit("concern",["A"]),unit("delivered",["B"])],new Set(["A"])).points,0);
});

test("source claims deduplicate exact restatements across documents but retain different progression states",()=>{
  const a=unit("planned_action",["A"],"Build flood barriers");
  const b={...a,path:"findings.1",topics:["B"],citations:[{...a.citations[0],id:"q2",documentId:"DOC2",quote:"Different supporting quotation"}]};
  const groups=mergeSourceClaims([a,b,{...b,kind:"delivered"}]);
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].topics,["A","B"]);
  assert.deepEqual(groups[0].documents,["DOC","DOC2"]);
  assert.equal(sumClaimScores(groups,true,true).value,6);
});

test("empty completed scopes are zero, unfinished or unassessed scopes are unavailable",()=>{
  assert.equal(sumClaimScores([],true,true).value,0);
  assert.equal(sumClaimScores([],false,true).value,null);
  assert.equal(sumClaimScores(mergeUnits([unit("planned_action")]),true,false).value,null);
  const partial=sumClaimScores(mergeUnits([unit("planned_action"),unit(null,["A"],"Unknown")]),true,true);
  assert.equal(partial.value,2);
  assert.equal(partial.unresolvedClaims,1);
  assert.equal(partial.complete,false);
});

test("dashboard sums topic claims and deduplicates overlapping topics at domain and country scope",()=>{
  const groups=mergeUnits([unit("planned_action",["A","B"],"Plan"),unit("delivered",["A"],"Output"),unit("context",["B"],"Context")]);
  const topics=["A","B"].map(id=>({id,label:id,placements:[{domain:"D"}]}));
  const data={ready:true,outdated:0,retagPending:0,untagged:[],tax:{domains:[{id:"D",enabled:true,label:"Domain"}],topics},
    topics:topics.map(topic=>({topic,items:groups.filter(group=>group.topics.includes(topic.id))}))} as unknown as CountryTopics;
  const overview={documents:[{id:"DOC"}],pages:{unreadable:0},coverage:[{domain:{id:"D"},summaryStatus:"done",cells:[{status:"found"}]}]} as unknown as CountryOverview;
  const result=buildDocumentationDashboard(data,overview);
  assert.deepEqual(result.topics.map(topic=>topic.claimScore.value),[6,2]);
  assert.equal(result.domains[0].claimScore.value,6);
  assert.equal(result.country.claimScore.value,6);
  assert.equal(result.country.claimScore.complete,true);
  assert.equal(result.country.score.value,62.5); // Equal mean of topic averages 75 and 50.
});
