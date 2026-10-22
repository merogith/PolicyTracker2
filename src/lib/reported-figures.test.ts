import assert from "node:assert/strict";
import { test } from "node:test";
import { groupReportedFigures, type ReportedFigure } from "./reported-figures";

function figure(patch: Partial<ReportedFigure> = {}): ReportedFigure {
  return { key: "a", iso3: "KAZ", country: "Kazakhstan", demo: false, finding: "Investment needs are reported.", kind: "planned_action", valueAsStated: "USD 10 billion", unit: "USD", period: "2030", conditionality: "conditional", documents: ["DOC-A"], domains: [{id:"energy",label:"Energy"}], ...patch };
}

test("groups a shared statement without losing individual values, conditions or source associations", () => {
  const first=figure();
  const second=figure({key:"b",valueAsStated:"USD 20 billion",period:"2040",conditionality:"unconditional",documents:["DOC-B"],domains:[{id:"water",label:"Water"}]});
  const input=[first,second];
  const before=structuredClone(input);
  const groups=groupReportedFigures(input);
  assert.equal(groups.length,1);
  assert.deepEqual(groups[0].figures,[first,second]);
  assert.equal(groups[0].figures[1].documents[0],"DOC-B");
  assert.deepEqual(input,before);
});

test("keeps countries, demo status, differing statements and stages separate", () => {
  const rows=[figure(),figure({iso3:"TUR"}),figure({demo:true}),figure({kind:"delivered"}),figure({finding:"Different investment needs."})];
  assert.equal(groupReportedFigures(rows).length,5);
});

test("keeps first-appearance order and all figures when statements interleave", () => {
  const a=figure(),b=figure({key:"b",finding:"Second statement."}),c=figure({key:"c",valueAsStated:"15"});
  const groups=groupReportedFigures([a,b,c]);
  assert.deepEqual(groups.map(group=>group.finding),[a.finding,b.finding]);
  assert.deepEqual(groups[0].figures.map(row=>row.key),["a","c"]);
  assert.equal(groups.reduce((count,group)=>count+group.figures.length,0),3);
  assert.deepEqual(groupReportedFigures([]),[]);
});
