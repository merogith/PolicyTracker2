import "dotenv/config";
import { db } from "../src/lib/db";
import { countryTopics } from "../src/lib/topics";
import { countryOverview } from "../src/lib/overview";
import { buildDocumentationDashboard } from "../src/lib/documentation-score";
import { buildSearchableClaims } from "../src/lib/claim-explorer";
import { claimScore } from "../src/lib/claim-score";
import { buildRegionalReferences, normalizedMetric } from "../src/lib/dashboard-metrics";

async function main() {
  const countries=await db.country.findMany({where:{status:"active"},orderBy:{name:"asc"}});
  const rows=await Promise.all(countries.map(async country=>{
    const [topics,overview]=await Promise.all([countryTopics(country.id),countryOverview(country.id)]);
    const dashboard=buildDocumentationDashboard(topics,overview);
    const claims=buildSearchableClaims(country,topics);
    const reasons:Record<string,number>={};
    for(const claim of claims) {
      const score=claimScore(claim.units);
      if(score.points===null) reasons[score.reason]=(reasons[score.reason]??0)+1;
    }
    if (process.argv.includes("--details")) console.log(JSON.stringify({iso3:country.iso3,examples:claims.filter(claim=>claimScore(claim.units).points===null).slice(0,4).map(claim=>({
      reason:claimScore(claim.units).reason,units:claim.units.map(unit=>({text:unit.text,kind:unit.kind,sources:unit.supportingFindings?.map(f=>({text:f.text,type:f.classification?.statement_type.value,kind:f.kind}))})),
    }))},null,2));
    return {country,topics,dashboard,reasons};
  }));
  const reference=buildRegionalReferences(rows.map(row=>row.dashboard),"claim_points").country;
  console.log(JSON.stringify({reference: {...reference,values:reference.values},countries:rows.map(({country,dashboard,reasons})=>({
    iso3:country.iso3,demo:dashboard.demo,processing:dashboard.country.processingState,
    points:dashboard.country.claimScore,standardizedScore:normalizedMetric(dashboard.country,"claim_points",reference,dashboard.demo),unresolvedReasons:reasons,
  }))},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
