import { BarChart3, ChevronRight, FileSpreadsheet, Globe2, LayoutDashboard, Layers, Plus, Scale, Target } from "lucide-react";
import Link from "next/link";
import { CountryDomainMatrix } from "@/components/charts/country-matrix";
import { PolicyDashboard } from "@/components/design-preview/policy-design-preview";
import { dashboardPresentation, previewMetric } from "@/lib/dashboard-preview";
import { dashboardSelection, buildRegionalReferences, normalizedMetric } from "@/lib/dashboard-metrics";
import { readReport } from "@/lib/report-reader";
import { formatMetric, parseDashboardMetric, parseActionStages, metricQuery } from "@/lib/dashboard-metrics";
import { MetricControls, ActionStageSettings } from "@/components/charts/metric-controls";
import { KindChip } from "@/components/charts/kind";
import { CreateCountryForm } from "@/components/create-country-form";
import { PageHeader } from "@/components/page-header";
import { RegionalOverview, RegionalPosition } from "@/components/regional-dashboard";
import { ClaimExplorer } from "@/components/claim-explorer";
import { buildSearchableClaims } from "@/lib/claim-explorer";
import { RegionalFigures } from "@/components/regional-figures";
import { Section } from "@/components/section";
import { Tabs } from "@/components/tabs";
import { db } from "@/lib/db";
import { buildDocumentationDashboard } from "@/lib/documentation-score";
import { countryOverview } from "@/lib/overview";
import { countryTopics } from "@/lib/topics";
import { loadTaxonomyCached } from "@/lib/taxonomy";
import { STATIC_DEMO } from "@/lib/static-demo";


export default async function CountriesPage({ searchParams }: PageProps<"/countries">) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" && ["overview","compare","claims","targets","figures","position"].includes(sp.view) ? sp.view : sp.matrix ? "compare" : "overview";
  const { metric: mode, scale } = dashboardSelection(sp.matrix ?? sp.metric, sp.scale);
  const stages = parseActionStages(sp.stages);
  const selectedMetric = view === "position" ? parseDashboardMetric(sp.metric) : mode;
  const controls = { pathname: "/countries", fixed: { view: "compare" }, metricKey: "matrix" as const, metric: mode, scale, stages };
  const [countries,tax] = await Promise.all([
    db.country.findMany({where:{status:"active"},orderBy:{name:"asc"}}),
    loadTaxonomyCached(),
  ]);
  const assessments = await Promise.all(countries.map(async country=>{
    const report = await readReport(country.id);
    const [topics,overview] = report ? [report.data.topics,report.data.overview] : await Promise.all([countryTopics(country.id,tax),countryOverview(country.id,tax)]);
    return {iso3:country.iso3,name:country.name,reportId:report?.id,reportTitle:report?.title,documents:overview.documents.length,overview,topics,dashboard:buildDocumentationDashboard(topics,overview,stages)};
  }));
  // Main reports can use earlier taxonomies; keep their domains accessible in regional views.
  const domainCatalogue = assessments.length ? [...new Map(assessments.flatMap(row => row.topics.tax.domains).map(domain => [domain.id, domain])).values()] : tax.domains;
  const domains = domainCatalogue.filter(domain => domain.enabled);
  const real = assessments.filter(row=>!row.dashboard.demo);
  const demos = assessments.filter(row=>row.dashboard.demo);
  const documentCount = real.reduce((sum,row)=>sum+row.documents,0);
  const claimReferences = buildRegionalReferences(assessments.map(row => row.dashboard), "claim_points");

  return <div className="flex flex-col gap-5">
    <PageHeader title="Regional policy tracker" meta={<span>{real.length} countr{real.length===1?"y":"ies"} · {documentCount} source document{documentCount===1?"":"s"}</span>} actions={!STATIC_DEMO&&<Link href="/countries#add" className="btn btn-primary"><Plus className="size-3.5" aria-hidden/>Add country</Link>}/>
    <Tabs label="Regional dashboard views" active={view} items={[
      {id:"overview",href:"/countries",label:<><LayoutDashboard className="size-4" aria-hidden/>Overview</>},
      {id:"compare",href:`/countries?view=compare&matrix=${selectedMetric}&scale=${scale}&stages=${stages.join(",")}`,label:<><BarChart3 className="size-4" aria-hidden/>Compare</>},
      {id:"claims",href:"/countries?view=claims",label:<><Layers className="size-4" aria-hidden/>Claims</>},
      {id:"targets",href:"/countries?view=targets",label:<><Target className="size-4" aria-hidden/>Targets</>},
      {id:"figures",href:"/countries?view=figures",label:<><FileSpreadsheet className="size-4" aria-hidden/>Reported figures</>},
      {id:"position",href:`/countries?view=position&${metricQuery(selectedMetric,"raw",stages)}`,label:<><Scale className="size-4" aria-hidden/>Regional average</>},
    ]}/>
    {countries.length===0&&<div className="panel flex flex-col items-start gap-3 p-6"><Globe2 className="size-8 text-primary" aria-hidden/><h2 className="text-base font-semibold">Start with a country</h2><p className="max-w-prose text-sm text-muted">Add a country, then upload its policy documents. Analysis starts automatically.</p></div>}
    {view==="overview"&&assessments.length>0&&<>
      <PolicyDashboard key={JSON.stringify(sp)} embedded countries={dashboardPresentation(assessments)} actionStages={stages} initial={{
        country: real[0]?.iso3 ?? assessments[0].iso3, metric: previewMetric(mode), normalized: scale === "normalized", domain: "", comparison: "",
        region: true, all: sp.all === "1", tab: "overview", chart: "radar",
      }}/>
      <details className="panel p-4"><summary className="cursor-pointer text-sm font-medium">Regional details</summary><div className="mt-4"><RegionalOverview rows={assessments}/></div></details>
    </>}
    {view==="compare"&&<Section id="comparison" title="Compare countries by domain" actions={<MetricControls {...controls}/>}><ActionStageSettings {...controls}/><CountryDomainMatrix rows={real.map(({iso3,name,documents,dashboard})=>({iso3,name,documents,dashboard}))} domains={domains} mode={mode} scale={scale} stages={stages}/></Section>}
    {(view==="claims"||view==="targets")&&<ClaimExplorer key={view} rows={assessments.flatMap(row=>buildSearchableClaims({iso3:row.iso3,name:row.name},row.topics))} domainCatalogue={domainCatalogue} targetsOnly={view==="targets"}/>}
    {view==="figures"&&<RegionalFigures rows={assessments.map(row=>({iso3:row.iso3,country:row.name,demo:row.dashboard.demo,figures:row.overview.figures}))} domains={domains.map(({id,label})=>({id,label}))}/>}
    {view==="position"&&<RegionalPosition rows={assessments} metric={typeof sp.metric==="string"?sp.metric:"claim_points"} profile={typeof sp.profile==="string"?sp.profile:undefined} area={typeof sp.area==="string"?sp.area:undefined} stages={stages}/>}
    {(view==="compare")&&<Section title="Country profiles">
      <ul className="grid gap-3 lg:grid-cols-2">{real.map(row=><li key={row.iso3}><Link href={`/countries/${row.iso3}`} className="group flex h-full flex-col gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft font-mono text-xs font-semibold text-primary-ink">{row.iso3}</span><div className="min-w-0 flex-1"><p className="font-semibold group-hover:text-primary-ink">{row.name}</p><p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">{row.documents} document{row.documents===1?"":"s"}{[...new Set(row.overview.documents.map(doc=>doc.kind))].map(kind=><KindChip key={kind} kind={kind}/>)}</p></div><ChevronRight className="mt-2 size-4 text-muted" aria-hidden/></div><div className="grid grid-cols-3 gap-3"><div><p className="text-xl font-semibold tabular">{formatMetric(normalizedMetric(row.dashboard.country,"claim_points",claimReferences.country),"/100")}<span className="text-xs text-muted">/100</span></p><p className="text-xs text-muted">Normalized claim points</p></div><div><p className="text-xl font-semibold tabular">{row.dashboard.country.findings}</p><p className="text-xs text-muted">claims</p></div><div><p className="text-xl font-semibold tabular">{row.topics.ready?`${row.dashboard.country.topicsWithResponses}/${row.dashboard.country.topicCount}`:"—"}</p><p className="text-xs text-muted">topics with action claims</p></div></div><div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{width:`${row.dashboard.country.responseCoveragePercent??0}%`}}/></div><span className="text-xs text-muted">{row.dashboard.country.responseCoveragePercent===null?"Awaiting results":`${formatMetric(row.dashboard.country.responseCoveragePercent,"%")}% of topics with action claims`}</span></div>{!row.dashboard.country.processingComplete&&<span className="text-xs text-muted">{row.topics.ready?"Partial analysis · observed findings so far":"Awaiting analysis"}</span>}</Link></li>)}</ul>
      {real.length===0&&<p className="text-sm text-muted">Add a country with source documents to begin the regional overview.</p>}
    </Section>}
    {demos.length>0&&<details className="rounded-xl border border-border bg-surface p-4 text-xs"><summary className="cursor-pointer font-medium text-muted">Demo profiles · {demos.length} · excluded from comparisons</summary><ul className="mt-3 flex flex-wrap gap-3">{demos.map(row=><li key={row.iso3}><Link href={`/countries/${row.iso3}`} className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink hover:underline">{row.name} · Demo</Link></li>)}</ul></details>}
    {view==="overview"&&!STATIC_DEMO&&<Section id="add" title="Add a country"><CreateCountryForm/></Section>}
  </div>;
}
