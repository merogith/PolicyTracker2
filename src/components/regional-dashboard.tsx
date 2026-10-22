import { ChevronRight } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { ReportInput } from "@/components/report-link";
import { buildCohortKey, compareCohort, summarizeRegion, type RegionalCountry } from "@/lib/regional-dashboard";
import { ActionScoreExplanation, ClaimScoreExplanation, DocumentationLegend, formatMetric } from "./charts/documentation-dashboard";
import { ComparisonBars, DistributionBars } from "./charts/comparison-bars";
import { Section } from "./section";
import { buildRegionalReferences, deviationBand, isCountMetric, metricComplete, regionalReference, DEFAULT_ACTION_STAGES, metricLabel, metricQuery, metricUnit, metricValue, normalizedMetric, parseDashboardMetric, supportsNormalization } from "@/lib/dashboard-metrics";
import { ActionStageSettings, DeviationLegend, MetricControls, NormalizationNote } from "./charts/metric-controls";
import { statementTypeLabel } from "@/lib/statement-types";
import { DOCUMENTATION_RUBRIC } from "@/lib/documentation-stage";


export function RegionalOverview({rows}:{rows:RegionalCountry[]}) {
  const s=summarizeRegion(rows),real=rows.filter(row=>!row.dashboard.demo);
  const reference=buildRegionalReferences(real.map(row=>row.dashboard),"claim_points").country;
  const stages=[{label:statementTypeLabel("commitment"),value:s.stages.commitment,color:"var(--ladder-1)"},{label:statementTypeLabel("planned_action"),value:s.stages.planned,color:"var(--ladder-2)"},{label:statementTypeLabel("underway"),value:s.stages.underway,color:"var(--ladder-3)"},{label:statementTypeLabel("delivered"),value:s.stages.delivered,color:"var(--ladder-4)"},{label:"Mixed statement types",value:s.stages.mixed,color:"var(--data-unavailable)"}];
  const stageTotal = stages.reduce((total, stage) => total + stage.value, 0);
  const gaps=s.topicSignals.filter(t=>t.countriesWithoutAction>0);
  return <div className="flex flex-col gap-6">
    <div className="grid gap-4 border-b border-border pb-5 sm:grid-cols-3">{[
      {label:"Claims",value:s.findings,sub:`${s.responses} action · ${s.context} context`,href:"/countries?view=compare&matrix=claims"},
      {label:"Implementation reported",value:s.stages.underway+s.stages.delivered,sub:`${s.stages.underway} underway · ${s.stages.delivered} delivered`,href:"#reported-stages"},
      {label:"Topics without reported action",value:s.topicsWithoutAction,sub:null,href:"#evidence-gaps"}
    ].map(card=><Link key={card.label} href={card.href} className="group flex items-baseline justify-between gap-3 sm:block">
      <span className="block text-sm text-muted group-hover:text-primary-ink">{card.label}</span>
      <strong className="mt-1 block text-3xl font-semibold tracking-tight tabular">{card.value}</strong>
      {card.sub&&<span className="mt-1 hidden text-xs text-muted sm:block">{card.sub}</span>}
    </Link>)}</div>
    <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="text-base font-semibold">Countries</h2><Link href="/countries?view=position&metric=claim_points" className="text-sm text-primary-ink hover:underline">Compare countries</Link></div>
        <p className="px-5 pt-4 text-xs text-muted">Average: {formatMetric(reference.mean)} points · {reference.countries} countries</p>
        <div className="divide-y divide-border px-5">{real.map(row=>{const c=row.dashboard.country,standardized=normalizedMetric(c,"claim_points",reference),band=deviationBand(metricComplete(c,"claim_points")?c.claimScore.value:null,reference);return <Link key={row.iso3} href={`/countries/${row.iso3}?metric=claim_points&scale=normalized`} className="group flex items-center gap-4 py-5">
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold group-hover:text-primary-ink">{row.name}</span><span className="mt-1 block text-xs text-muted">{formatMetric(c.claimScore.value)} claim points · {c.findings} claims · {row.overview.documents.length} documents</span><span className="mt-1 block text-xs text-muted">{band.label}</span>{standardized!==null&&<span className="mt-3 block h-3 rounded-full bg-surface-2" aria-hidden><span className="block h-full rounded-full" style={{width:`${standardized}%`,background:`var(--compare-${band.tone})`}}/></span>}</span>
          <span className="shrink-0 text-right"><strong className="block text-3xl font-semibold tabular">{formatMetric(standardized,"/100")}</strong><span className="text-xs text-muted">{standardized===null?"Unavailable":"standardized /100"}</span>{!c.claimScore.complete&&<span className="mt-1 block rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">Provisional</span>}</span><ChevronRight className="size-4 shrink-0 text-muted" aria-hidden/>
        </Link>;})}{real.length===0&&<p className="py-5 text-sm text-muted">Add a country and its documents to begin.</p>}</div>
      </section>
      <Section id="reported-stages" title="Reported action">
        <DistributionBars rows={stages} total={stageTotal} unit="action groups"/>
        <details className="text-xs text-muted"><summary className="w-fit cursor-pointer">About reported action</summary><p className="mt-2">Mixed groups contain different statement types. Stages describe what sources report. <Link href="/methodology#claim-points" className="text-primary-ink hover:underline">Methodology</Link></p></details>
      </Section>
    </div>
    <DocumentationLegend metric="claim_points" scale="normalized"/>
    <section id="evidence-gaps" className="scroll-mt-6">
      <h2 className="text-base font-semibold">Topics without reported action</h2>
      <p className="mt-2 text-sm text-muted">Topics with only 0-point claims or no claims.</p>
      {gaps.length>0?<ul className="mt-3 divide-y divide-border">{gaps.map(topic=><li key={topic.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"><span>{topic.label}</span><span className="flex flex-wrap gap-3">{real.filter(row=>row.dashboard.topics.some(t=>t.id===topic.id&&t.responses===0)).map(row=><Link key={row.iso3} href={`/countries/${row.iso3}?tab=domains&topic=${topic.id}`} className="text-primary-ink hover:underline">{row.name} →</Link>)}</span></li>)}</ul>:<p className="mt-2 text-sm text-muted">None in the current assessments.</p>}
    </section>
    {(s.partialCountries>0||s.unanalysedCountries>0)&&<p className="text-sm text-muted">{s.partialCountries} partial · {s.unanalysedCountries} awaiting analysis</p>}
  </div>;
}

function profileFor(row: RegionalCountry) {
  const years = row.overview.documents.map(doc=>`${doc.kind}:${doc.editionDate.slice(0,4)}`).sort();
  return {key:buildCohortKey({documentKinds:row.overview.documents.map(doc=>doc.kind),taxonomyVersion:row.topics.tax.version,methodVersion:DOCUMENTATION_RUBRIC.version,scope:"all-supplied-documents",sourceWindow:years.join("|")}),label:years.map(value=>value.replace(":", " (") + ")").join(" + ") || "No documents"};
}

export function RegionalPosition({rows,metric:metricParam,profile,area,stages=DEFAULT_ACTION_STAGES,countryIso3}: {rows:RegionalCountry[];metric:string;profile?:string;area?:string;stages?:number[];countryIso3?:string}) {
  const metric=parseDashboardMetric(metricParam),real=rows.filter(row=>!row.dashboard.demo);
  const profiles=[...new Map(real.map(row=>{const p=profileFor(row);return [p.key,p] as const;})).values()];
  const selectedProfile=profiles.find(p=>p.key===profile);
  const catalog=real[0]?.dashboard;
  const validArea=area && (catalog?.domains.some(d=>`domain:${d.id}`===area) || catalog?.topics.some(t=>`topic:${t.id}`===area)) ? area : "country";
  const measure = (row:RegionalCountry) => validArea.startsWith("domain:") ? row.dashboard.domains.find(d=>d.id===validArea.slice(7)) : validArea.startsWith("topic:") ? row.dashboard.topics.find(t=>t.id===validArea.slice(6)) : row.dashboard.country;
  const areaLabel=validArea==="country"?"Country totals":validArea.startsWith("domain:")?catalog?.domains.find(d=>d.id===validArea.slice(7))?.label:catalog?.topics.find(t=>t.id===validArea.slice(6))?.label;
  const observations=real.map(row=>{const assessed=measure(row);return {iso3:row.iso3,value:assessed?metricValue(assessed,metric):null,cohortKey:"region",demo:false,complete:!!assessed&&metricComplete(assessed,metric)};});
  const region=compareCohort(observations,"region");
  const selectedRows=selectedProfile?real.filter(row=>profileFor(row).key===selectedProfile.key):real;
  const selectedIds=new Set(selectedRows.map(row=>row.iso3));
  const comparison=selectedProfile?compareCohort(observations.filter(row=>selectedIds.has(row.iso3)),"region"):region;
  const reference=regionalReference(region.comparisons.map(row=>row.value),real.length);
  const compared=new Map(comparison.comparisons.map(row=>[row.iso3,row]));
  const canNormalize=supportsNormalization(metric),averageLabel=selectedProfile?"group average":"regional average";
  const pathname=countryIso3?`/countries/${countryIso3}`:"/countries";
  const scope: Record<string,string>=countryIso3?{tab:"position"}:{view:"position"};
  const focusCountry=real.find(row=>row.iso3===countryIso3);
  const controls={pathname,fixed:{...scope,area:validArea,profile:selectedProfile?.key??"all"},metric,scale:"raw" as const,stages,showScale:false};
  const field="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  const differenceUnit=metric==="claims"?"claims":metric==="actions"?"actions":metric==="detail"||metric==="claim_points"?"points":"percentage points";
  const backToRegion=`${pathname}?${new URLSearchParams({...scope,area:validArea,metric,stages:stages.join(",")})}`;
  return <div className="flex flex-col gap-5">
    <Section title={`${focusCountry?.name??"Countries"} vs ${averageLabel}`} actions={<MetricControls {...controls}/>}>
      <form method="get" action={pathname} className="flex flex-wrap items-end gap-3">
        <ReportInput />
        <input type="hidden" name={countryIso3?"tab":"view"} value="position"/>
        <input type="hidden" name="metric" value={metric}/>
        <input type="hidden" name="stages" value={stages.join(",")}/>
        <input type="hidden" name="profile" value={selectedProfile?.key??"all"}/>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium sm:max-w-md">Compare across<select name="area" defaultValue={validArea} className={field}><option value="country">Country totals · all topics</option><optgroup label="Domains">{catalog?.domains.map(d=><option key={d.id} value={`domain:${d.id}`}>{d.label}</option>)}</optgroup><optgroup label="Topics">{catalog?.topics.map(t=><option key={t.id} value={`topic:${t.id}`}>{t.id} · {t.label}</option>)}</optgroup></select></label>
        <button type="submit" className="btn btn-primary h-10">Apply</button>
      </form>
      <ActionStageSettings {...controls}/>
      <details className="text-xs text-muted" open={selectedProfile ? true : undefined}>
        <summary className="w-fit cursor-pointer font-medium hover:text-foreground">{selectedProfile?"Source filter active":"Filter by source documents"}</summary>
        <form method="get" action={pathname} className="mt-3 flex flex-wrap items-end gap-3">
          <ReportInput />
          <input type="hidden" name={countryIso3?"tab":"view"} value="position"/><input type="hidden" name="metric" value={metric}/><input type="hidden" name="area" value={validArea}/><input type="hidden" name="stages" value={stages.join(",")}/>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xl">Document collection<select name="profile" defaultValue={selectedProfile?.key??"all"} className={field}><option value="all">All countries in the region</option>{profiles.map(p=>{const n=real.filter(row=>profileFor(row).key===p.key).length;return <option key={p.key} value={p.key}>{p.label} · {n} {n===1?"country":"countries"}</option>;})}</select></label>
          <button type="submit" className="btn btn-sm">Apply filter</button>
          {selectedProfile&&<Link href={backToRegion} className="py-2 text-primary-ink hover:underline">Show all countries</Link>}
          <p className="basis-full leading-relaxed">Matches document types and edition years. Standardized scores still use the full region.</p>
        </form>
      </details>
    </Section>
    <section className="overflow-hidden rounded-xl border border-border bg-surface" aria-label="Regional comparison results">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-5">
        <div><p className="text-xs text-muted">{areaLabel} · {selectedProfile?"Matching sources":"All countries in the region"}</p><h2 className="mt-1 text-base font-semibold">{metricLabel(metric)} by country</h2><p className="mt-2 text-xs text-muted">{comparison.n} of {selectedRows.length} {selectedRows.length===1?"country":"countries"} included in the average</p></div>
        <div className="text-left sm:text-right"><p className="text-xs capitalize text-muted">{averageLabel}</p><p className="mt-1 text-3xl font-semibold tabular">{formatMetric(comparison.mean,metricUnit(metric))}<span className="ml-1 text-sm font-normal text-muted">{comparison.mean===null?"":metricUnit(metric)}</span></p></div>
      </div>
      {comparison.n<2&&<p className="border-b border-border bg-primary-soft px-5 py-3 text-sm">{comparison.n===1?"Only one complete country is available":"No complete countries are available"}{selectedProfile?" with this source filter":" for this measure"}. An average needs at least two. Raw values are shown below. {selectedProfile&&<Link href={backToRegion} className="font-medium text-primary-ink hover:underline">Use all countries →</Link>}</p>}
      <div className="border-b border-border p-5 sm:p-6">
        <ComparisonBars
          rows={selectedRows.map(row=>{const assessed=measure(row),raw=assessed?metricValue(assessed,metric):null,band=deviationBand(assessed&&metricComplete(assessed,metric)?raw:null,reference);return {id:row.iso3,label:row.name,value:raw,color:`var(--compare-${band.tone})`,provisional:!compared.has(row.iso3),href:`/countries/${row.iso3}?tab=overview&${metricQuery(metric,"raw",stages)}`};})}
          average={comparison.mean} averageLabel={selectedProfile?"Group average":"Regional average"} unit={metricUnit(metric)}
          maximum={isCountMetric(metric)?Math.max(1,...selectedRows.map(row=>{const assessed=measure(row);return assessed?metricValue(assessed,metric)??0:0;})):100}
        />
      </div>
      <div className="border-b border-border p-5"><DeviationLegend/>
        <Link href="/methodology#comparison" className="mt-3 inline-block text-xs text-primary-ink hover:underline">Comparison methodology</Link>
      </div>
      <details className="p-5"><summary className="w-fit cursor-pointer text-sm font-medium text-primary-ink">Show comparison table</summary><div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead><tr className="border-b border-border bg-surface-2/50 text-left text-xs text-muted"><th scope="col" className="px-5 py-3 font-medium">Country</th><th scope="col" className="px-4 py-3 text-right font-medium">{metricLabel(metric)}{metricUnit(metric)}</th>{canNormalize&&<th scope="col" className="px-4 py-3 text-right font-medium">Standardized regional score<span className="mt-1 block text-xs font-normal">0–100 · regional average maps to 50</span></th>}<th scope="col" className="px-5 py-3 text-right font-medium">Difference from {averageLabel}</th></tr></thead>
          <tbody>{selectedRows.map(row=>{
            const assessed=measure(row),raw=assessed?metricValue(assessed,metric):null,normalized=assessed?normalizedMetric(assessed,metric,reference):null;
            const delta=compared.get(row.iso3)?.delta??null,eligible=compared.has(row.iso3);
            const band=deviationBand(assessed&&metricComplete(assessed,metric)?raw:null,reference);
            return <tr key={row.iso3} className={`border-b border-border last:border-0 ${row.iso3===countryIso3?"bg-primary-soft/40":""}`}>
              <th scope="row" className="px-5 py-4 text-left font-normal"><Link href={`/countries/${row.iso3}?tab=overview&${metricQuery(metric,"raw",stages)}`} className="font-medium hover:text-primary-ink hover:underline">{row.name}</Link>{row.iso3===countryIso3&&<span className="ml-2 text-xs font-medium text-primary-ink">This country</span>}<p className="mt-1 text-xs text-muted">{row.overview.documents.length} source documents{!eligible?" · assessment incomplete":""}</p></th>
              <td className="px-4 py-4 text-right font-semibold tabular">{formatMetric(raw,metricUnit(metric))}{raw!==null&&metricUnit(metric)==="%"?"%":""}</td>
              {canNormalize&&<td className="px-4 py-4 text-right"><span title={band.label} className="inline-block min-w-16 rounded-md px-3 py-1.5 font-semibold tabular" style={{background:`var(--compare-${band.tone}-soft)`,color:`var(--compare-${band.tone}-ink)`}}>{formatMetric(normalized,"/100")}</span></td>}
              <td className="px-5 py-4 text-right text-xs text-muted">{delta===null?"—":<><strong className="font-medium text-foreground tabular">{delta>0?"+":""}{formatMetric(delta,metricUnit(metric))}</strong> {differenceUnit}<span className="mt-1 block">{delta===0?"At the average":delta>0?"Above average":"Below average"}</span></>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div></details>
      {selectedRows.length===0&&<p className="px-5 py-6 text-sm text-muted">Add country documents to begin comparing results.</p>}
      
    </section>
    <details className="text-xs text-muted"><summary className="w-fit cursor-pointer font-medium hover:text-foreground">How to read this comparison</summary><div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <p>The average includes complete, non-demo assessments. Differences are shown in {differenceUnit}; they compare countries at this point in time.</p>
      {canNormalize&&<><NormalizationNote/><p>Comparison reference: {reference.countries}/{reference.total} countries · regional average {formatMetric(reference.mean,metricUnit(metric))}{metricUnit(metric)}.</p></>}
      {metric==="actions"&&<p>Action claims count the selected claim stages once per group. Default stages 1–4 include commitments, plans, underway and delivered claims.</p>}
      {metric==="detail"&&<ActionScoreExplanation/>}
      {metric==="claim_points"&&<ClaimScoreExplanation/>}
    </div></details>
  </div>;
}
