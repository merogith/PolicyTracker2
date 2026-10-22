import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSearchableClaims, filterClaims, groupClaims, sortClaims } from "./claim-explorer";
import { DIMENSION_NAMES, LABEL_CATALOGUE, labelOptions, type Classification, type LabelDimension } from "./labels";
import type { CountryTopics } from "./topics";
import type { MergedItem, Unit } from "./topic-merge";
import { buildDocumentationDashboard } from "./documentation-score";

const unit=(text:string,kind="commitment"):Unit=>({domainId:"A",domainLabel:"Climate",path:"findings.0",kind,text,topics:["A-1"],citations:[{id:"c",documentId:"DOC",page:3,quote:"Original policy quotation",verified:true}]});
function fixture(){
  const shared:MergedItem={stage:1,documents:["DOC"],topics:["A-1","B-1"],units:[unit("The country targets a 40% reduction by 2030.")]};
  const topics=[{id:"A-1",label:"Climate",placements:[{domain:"A"}]},{id:"B-1",label:"Water",placements:[{domain:"B"}]}];
  return {shared,data:{tax:{domains:[{id:"A",label:"Climate",enabled:true},{id:"B",label:"Water",enabled:true}],topics},topics:topics.map(topic=>({topic,items:[shared]})),untagged:[],hasDemoResults:false} as unknown as CountryTopics};
}

test("legacy target wording does not manufacture a structured target label",()=>{
  const {data}=fixture();
  const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  assert.equal(rows[0].targetClassified,null);
  assert.equal(filterClaims(rows,{targetsOnly:true}).length,0);
  assert.equal(filterClaims(rows,{search:"targets"}).length,1);
});

test("every catalogue tag and every observed custom value has a filter option",()=>{
  for (const dimension of Object.keys(DIMENSION_NAMES) as LabelDimension[]) {
    const options=labelOptions(dimension,["custom_observed_value"]);
    assert.ok(options.some(option=>option.id==="custom_observed_value"),dimension);
    assert.equal(options.length,new Set(options.map(option=>option.id)).size);
  }
  for (const [dimension,values] of Object.entries(LABEL_CATALOGUE.fact_enums)) {
    assert.deepEqual(labelOptions(dimension as LabelDimension).map(option=>option.id),values);
  }
  assert.deepEqual(labelOptions("actor_role").map(option=>option.id),LABEL_CATALOGUE.actor_roles);
});

test("Context, Projection and Result reported are individually filterable and never fall into Other",()=>{
  const {data,shared}=fixture();
  for (const type of ["context","projection","result_reported","proposal","other"]) {
    shared.units[0].kind="concern";
    shared.units[0].classifications=[{sourceId:"s",documentId:"DOC",classification:{
      statement_type:{value:type,quotes:["Original policy quotation"]},
      labels:{purpose:[],geographic_scope:[],hazards:[],themes:[],affected_groups:[],policy_instruments:[],risk_component:[],risk_function:[]},
      facts:[],actors:[],priority:null,
    }}];
    const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
    assert.equal(filterClaims(rows,{stage:type}).length,1,type);
    assert.equal(filterClaims(rows,{stage:"concern"}).length,0,type);
    assert.equal(filterClaims(rows,{stage:"other"}).length,type==="other"?1:0,type);
    assert.equal(filterClaims(rows,{labels:{purpose:"__unlabeled"}}).length,1);
  }
  shared.units[0].classifications=[];
  shared.units[0].kind=null;
  const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  assert.equal(filterClaims(rows,{stage:"__unclassified"}).length,1);
  assert.equal(filterClaims(rows,{stage:"other"}).length,0);
});

test("claim discovery deduplicates cross-tagged groups and retains original evidence and search fields",()=>{
  const {data,shared}=fixture();
  const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  assert.equal(rows.length,1);
  assert.deepEqual(rows[0].domains.map(d=>d.id),["A","B"]);
  assert.equal(rows[0].units[0].citations[0].quote,shared.units[0].citations[0].quote);
  assert.equal(filterClaims(rows,{search:"ORIGINAL POLICY"}).length,1);
  assert.equal(filterClaims(rows,{domain:"B",stage:"commitment"}).length,1);
  assert.equal(filterClaims(rows,{stage:"delivered"}).length,0);
});

test("country and demo filters cannot leak another country's claims into a scoped view",()=>{
  const {data}=fixture();
  const a=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  const b=buildSearchableClaims({iso3:"BBB",name:"Beta"},{...data,hasDemoResults:true});
  assert.equal(filterClaims([...a,...b],{}).length,1);
  assert.equal(filterClaims([...a,...b],{country:"BBB"}).length,0);
  assert.equal(filterClaims([...a,...b],{country:"BBB",includeDemo:true}).length,1);
  assert.equal(filterClaims([...a,...b],{search:"no match",includeDemo:true}).length,0);
});

test("untagged claims remain searchable but disabled-only home topics stay outside the national inventory",()=>{
  const {data}=fixture();
  data.tax.domains[1].enabled=false;
  data.topics=data.topics.map((row,index)=>index===0?{...row,items:[]}:row);
  data.untagged=[{stage:null,documents:[],topics:[],units:[{...unit("Background", "other"),topics:[]}]}];
  const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  assert.equal(rows.length,1);
  assert.equal(rows[0].units[0].text,"Background");
  assert.equal(rows[0].targetClassified,null);
});

test("source labels support targets, combined filters, grouping and sorting without changing claim counts",()=>{
  const {data,shared}=fixture();
  const classification:Classification={statement_type:{value:"commitment",quotes:["Original policy quotation"]},labels:{purpose:[{value:"adaptation",quotes:["Original policy quotation"]},{value:"mitigation",quotes:["Original policy quotation"]}],geographic_scope:[],hazards:[{value:"flood",quotes:["Original policy quotation"]}],themes:[],affected_groups:[],policy_instruments:[],risk_component:[],risk_function:[]},facts:[{fact_type:"target",target_kind:"quantitative",text:"40%",metric:"Reduction",value_as_stated:"40%",unit:"%",period:"2030",baseline_as_stated:null,comparator:"equal",direction:"decrease",basis:"not_stated",total_or_additional:"not_stated",conditionality:"conditional",finance_status:"not_stated",quotes:["Original policy quotation"]}],actors:[],priority:null};
  shared.units[0].classifications=[{sourceId:"source#0",documentId:"DOC",classification}];
  shared.units[0].classificationComplete=true;
  const rows=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  assert.equal(rows[0].targetClassified,true);
  assert.equal(rows[0].labeling,"complete");
  assert.equal(filterClaims(rows,{targetsOnly:true,labels:{purpose:"adaptation",hazards:"flood"}}).length,1);
  assert.equal(filterClaims(rows,{labels:{conditionality:"conditional",direction:"decrease",comparator:"equal",basis:"not_stated"}}).length,1);
  assert.equal(filterClaims(rows,{labels:{conditionality:"unconditional"}}).length,0);
  assert.equal(filterClaims(rows,{labels:{purpose:"adaptation",hazards:"drought"}}).length,0);
  assert.equal(filterClaims(rows,{topic:"A-1",document:"DOC",search:"mitigation"}).length,1);
  const groups=groupClaims(rows,"purpose");
  assert.equal(groups.length,2);
  assert.equal(new Set(groups.flatMap(g=>g.rows.map(r=>r.id))).size,1);
  assert.deepEqual(sortClaims(rows,"statement_type"),rows);
  shared.units[0].classifications[0].classification.facts=[];
  assert.equal(buildSearchableClaims({iso3:"AAA",name:"Alpha"},data)[0].targetClassified,false);
  shared.units[0].classificationComplete=false;
  assert.equal(buildSearchableClaims({iso3:"AAA",name:"Alpha"},data)[0].targetClassified,null);
});

test("sorting uses the selected category, keeps unknowns last and does not mutate original order",()=>{
  const {data}=fixture();
  const [original]=buildSearchableClaims({iso3:"AAA",name:"Alpha"},data);
  const a={...original,id:"a",labels:{...original.labels,purpose:["mitigation"]},documents:["one","two"]};
  const b={...original,id:"b",labels:{...original.labels,purpose:["adaptation"]},documents:["one"]};
  const c={...original,id:"c",labels:{...original.labels,purpose:[]},documents:[]};
  const rows=[a,c,b];
  assert.deepEqual(sortClaims(rows,"purpose").map(r=>r.id),["b","a","c"]);
  assert.deepEqual(sortClaims(rows,"purpose",true).map(r=>r.id),["a","b","c"]);
  assert.deepEqual(sortClaims(rows,"sources",true).map(r=>r.id),["a","b","c"]);
  assert.deepEqual(rows.map(r=>r.id),["a","c","b"]);
});

test("domain filters match dashboard counts; related and untagged scopes stay explicit", () => {
  const { data, shared } = fixture();
  data.tax.topics[0].placements.push({ domain: "B", group: "general" });
  shared.topics = ["A-1"];
  data.topics[1].items.splice(0);
  data.untagged = [{ stage: null, documents: [], topics: [], units: [{ ...unit("Untagged context", "other"), topics: [], domainId: "B" }] }];
  data.ready = true;
  data.outdated = 0;
  data.retagPending = 0;
  const rows = buildSearchableClaims({ iso3: "AAA", name: "Alpha" }, data);
  const dashboard = buildDocumentationDashboard(data);
  assert.equal(rows.length, dashboard.country.findings);
  for (const domain of dashboard.domains) {
    assert.equal(filterClaims(rows, { domain: domain.id }).length, domain.findings);
  }
  assert.equal(filterClaims(rows, { domain: "B" }).length, 0);
  assert.equal(filterClaims(rows, { domain: "B", domainScope: "related" }).length, 1);
  assert.equal(filterClaims(rows, { domain: "B", domainScope: "untagged" }).length, 1);
  assert.equal(filterClaims(rows, { domainScope: "untagged" }).length, 1);
  assert.ok(groupClaims(rows, "domain").some(g => g.label === "Outside assessed topics"));
  assert.equal(groupClaims(rows, "domain", "related").find(g => g.key === "B")!.rows.length, 1);
});
