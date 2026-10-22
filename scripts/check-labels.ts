import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { db } from "../src/lib/db";
import { FACETS, readClassification } from "../src/lib/labels";
import { validateClassification } from "../src/lib/analysis/labels";
import { countryTopics } from "../src/lib/topics";
import { buildSearchableClaims } from "../src/lib/claim-explorer";

type Json = Record<string, unknown>;
function originalOutput(value: Json) {
  return { ...value, findings: ((value.findings ?? []) as Json[]).map(finding => {
    const original = { ...finding };
    delete original.classification;
    delete original.classification_version;
    return original;
  }) };
}
async function main() {
  const at = process.argv.indexOf("--baseline");
  const baseline = at >= 0 ? JSON.parse(readFileSync(process.argv[at + 1], "utf8")) as Array<{id:string;output:Json}> : [];
  const before = new Map(baseline.map(result=>[result.id,result.output]));
  const results = await db.analysisResult.findMany({where:{status:"done",scope:"document"},include:{citations:true}});
  const facets = Object.fromEntries(FACETS.map(f=>[f,0]));
  const types:Record<string,number>={}, facts:Record<string,number>={};
  let classified=0, unclassified=0, compared=0;
  const errors:string[]=[];
  for (const result of results) {
    const output=result.output as Json;
    if (before.has(result.id)) {
      compared++;
      if (!isDeepStrictEqual(originalOutput(output),originalOutput(before.get(result.id)!))) errors.push(`${result.id}: original output changed`);
    }
    for (const [index,finding] of ((output.findings??[]) as Json[]).entries()) {
      const classification=readClassification(finding);
      if (!classification) {unclassified++;continue;}
      classified++;
      try { validateClassification(classification,result.citations.filter(c=>c.itemPath===`findings.${index}`&&c.verified).map(c=>c.quote)); }
      catch(error) {errors.push(`${result.id}#findings.${index}: ${String(error)}`);}
      for (const facet of FACETS) facets[facet]+=classification.labels[facet].length;
      types[classification.statement_type.value]=(types[classification.statement_type.value]??0)+1;
      for(const fact of classification.facts) facts[fact.fact_type]=(facts[fact.fact_type]??0)+1;
    }
  }
  if (compared!==before.size) errors.push("Some baseline records are missing or no longer completed");
  const countries=[];
  for(const country of await db.country.findMany({where:{status:"active"},orderBy:{iso3:"asc"}})) {
    const rows=buildSearchableClaims(country,await countryTopics(country.id));
    countries.push({iso3:country.iso3,claims:rows.length,complete:rows.filter(r=>r.labeling==="complete").length,partial:rows.filter(r=>r.labeling==="partial").length,unavailable:rows.filter(r=>r.labeling==="unavailable").length,targets:rows.filter(r=>r.targetClassified===true).length});
  }
  const report={at:new Date(),classified,unclassified,facets,statementTypes:types,factTypes:facts,countries,originalResultsCompared:compared,originalOutputsPreserved:before.size?errors.every(e=>!e.includes("original output")&&!e.includes("baseline")):null,errors};
  console.log(JSON.stringify(report,null,2));
  if(process.argv.includes("--save-report"))writeFileSync("output/claim-labels/verification.json",JSON.stringify(report,null,2)+"\n");
  if(errors.length)process.exitCode=1;
}
main().catch(error=>{console.error(String(error));process.exitCode=1;}).finally(()=>db.$disconnect());
