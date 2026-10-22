import assert from "node:assert/strict";
import { test } from "node:test";
import { zodTextFormat } from "openai/helpers/zod";
import { classificationSchema, labelBatchSchema, resolveLabelEvidence, validateClassification, validateLabelBatch } from "./labels";
import { FACETS, LABEL_CATALOGUE, type Classification } from "../labels";
const quote = "By 2030 we will reduce emissions by 40 percent, conditional on international support.";
function classification(): Classification {
  return {
    statement_type:{value:"commitment",quotes:[quote]},
    labels:{purpose:[{value:"mitigation",quotes:[quote]}],geographic_scope:[],hazards:[],themes:[],affected_groups:[],policy_instruments:[],risk_component:[],risk_function:[]},
    facts:[{fact_type:"target",target_kind:"quantitative",text:quote,metric:"Emissions reduction",value_as_stated:"40 percent",unit:"percent",period:"2030",baseline_as_stated:null,comparator:"equal",direction:"decrease",basis:"not_stated",total_or_additional:"not_stated",conditionality:"conditional",finance_status:"not_stated",quotes:[quote]}],
    actors:[],priority:null,
  };
}
test("full catalogue is active and strict structured output accepts its evidence-linked labels",()=>{
  assert.equal(FACETS.length,8);
  assert.ok(FACETS.every(f=>LABEL_CATALOGUE.facets[f].enabled));
  assert.equal(classificationSchema.safeParse(classification()).success,true);
  assert.equal(zodTextFormat(labelBatchSchema,"labels").strict,true);
  assert.doesNotThrow(()=>validateClassification(classification(),[quote]));
});
test("unsupported catalogue values and absent evidence are rejected",()=>{
  const unknown=classification();unknown.labels.hazards=[{value:"made_up",quotes:[quote]}];
  assert.equal(classificationSchema.safeParse(unknown).success,false);
  const unsupported=classification();unsupported.labels.affected_groups=[{value:"farmers",quotes:["A different source mentions farmers."]}];
  assert.throws(()=>validateClassification(unsupported,[quote]),/evidence/);
  const empty=classification();empty.statement_type.quotes=[];
  assert.equal(classificationSchema.safeParse(empty).success,false);
});
test("target qualifiers are preserved and projections cannot inherit a target kind",()=>{
  const c=classification(); assert.equal(c.facts[0].conditionality,"conditional");
  c.facts[0].fact_type="projection";
  assert.throws(()=>validateClassification(c,[quote]),/target kind/);
  c.facts[0].target_kind=null;
  assert.doesNotThrow(()=>validateClassification(c,[quote]));
  c.facts[0].value_as_stated="90 percent";
  assert.throws(()=>validateClassification(c,[quote]),/value_as_stated/);
});
test("backfill refuses missing, duplicated and foreign finding IDs",()=>{
  const inputs=[{id:"a",text:quote,quotes:[quote]},{id:"b",text:quote,quotes:[quote]}];
  const a={id:"a",classification:classification()}, b={id:"b",classification:classification()};
  assert.throws(()=>validateLabelBatch(inputs,[a]),/omitted/);
  assert.throws(()=>validateLabelBatch(inputs,[a,a]),/repeated/);
  assert.throws(()=>validateLabelBatch(inputs,[a,{...b,id:"foreign"}]),/Unknown/);
  assert.doesNotThrow(()=>validateLabelBatch(inputs,[b,a]));
});

test("actor and priority wording require their own source evidence",()=>{
  const c=classification();
  c.actors=[{name:"Invented Ministry",role:"responsible",quotes:[quote]}];
  assert.throws(()=>validateClassification(c,[quote]),/Actor name/);
  c.actors=[];c.priority={text:"Top national priority",quotes:[quote]};
  assert.throws(()=>validateClassification(c,[quote]),/Priority wording/);
});

test("recovery references resolve only to the current finding's original quotations",()=>{
  const c=classification();
  c.statement_type.quotes=["Q0"];c.labels.purpose[0].quotes=["Q0"];c.facts[0].quotes=["Q0"];
  const input={id:"a",text:quote,quotes:[quote]};
  const resolved=resolveLabelEvidence(input,c);
  assert.deepEqual(resolved.statement_type.quotes,[quote]);
  assert.doesNotThrow(()=>validateClassification(resolved,[quote]));
  c.statement_type.quotes=["Q1"];
  assert.throws(()=>resolveLabelEvidence(input,c),/unknown quotation/);
});

test("English descriptions can use a decimal point while the source value retains its decimal comma",()=>{
  const c=classification(),source="1,5 times increase of the volume of production using RES";
  c.statement_type.quotes=[source];c.labels.purpose[0].quotes=[source];
  c.facts=[{...c.facts[0],text:"Increase production using renewable energy by 1.5 times.",value_as_stated:"1,5 times",quotes:[source]}];
  assert.doesNotThrow(()=>validateClassification(c,[source]));
  c.facts[0].value_as_stated="1.5 times";
  assert.throws(()=>validateClassification(c,[source]),/value_as_stated/);
});

test("small and high precision decimal commas normalize without guessing thousands separators", () => {
  for (const [source, display, passes] of [
    ["0,004 процента", "0.004 percent", true],
    ["12,3456 процента", "12.3456 percent", true],
    ["12,345 people", "12.345 people", false],
    ["12,345 people", "12345 people", false],
  ] as const) {
    const c = classification();
    c.statement_type.quotes = [source]; c.labels.purpose[0].quotes = [source];
    c.facts = [{ ...c.facts[0], text: display, value_as_stated: source, quotes: [source] }];
    if (passes) assert.doesNotThrow(() => validateClassification(c, [source]));
    else assert.throws(() => validateClassification(c, [source]), /adds a number/);
  }
});

test("Russian actor source case and English acronym expansions must retain exact names", () => {
  for (const [source, exact, changed] of [
    ["утвержденная Ми-\nнистром сельского хозяйства и продовольствия", "Министром сельского хозяйства и продовольствия", "Министр сельского хозяйства и продовольствия"],
    ['Ministry of Nature (hereinafter referred to as "MNREP")', "Ministry of Nature", "Ministry of Nature (MNREP)"],
  ]) {
    const c = classification();
    c.statement_type.quotes = [source]; c.labels.purpose = []; c.facts = [];
    c.actors = [{ name: exact, role: "responsible", quotes: [source] }];
    assert.doesNotThrow(() => validateClassification(c, [source]));
    c.actors[0].name = changed;
    assert.throws(() => validateClassification(c, [source]), /Actor name/);
  }
});
