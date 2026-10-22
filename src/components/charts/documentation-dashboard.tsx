import { ChevronRight, CircleHelp } from "lucide-react";
import type { CSSProperties } from "react";
import { presentedScore, ScoreBadge, ScoreColorKey } from "./score-presentation";
import { ReportLink as Link } from "@/components/report-link";
import { documentationBand, processingLabel, type DocumentationDashboard, type DocumentationTone } from "@/lib/documentation-score";
import { DOCUMENTATION_RUBRIC, documentationEmptyLabel } from "@/lib/documentation-stage";
import { DEFAULT_ACTION_STAGES, deviationBand, isCountMetric, metricComplete, formatMetric, metricLabel, metricQuery, metricUnit, metricValue, normalizedMetric, type DashboardMetric, type MetricScale, type RegionalReferences } from "@/lib/dashboard-metrics";
import { ActionStageSettings, MetricControls, NormalizationNote } from "./metric-controls";
import { DistributionBars } from "./comparison-bars";
import { DistributionSummary, type DistributionSummaryRow } from "./distribution-summary";
export { formatMetric, metricLabel, metricValue, parseDashboardMetric, type DashboardMetric } from "@/lib/dashboard-metrics";

export function metricTone(value: number | null, metric: DashboardMetric = "detail"): DocumentationTone { return isCountMetric(metric) ? "unavailable" : documentationBand(value).tone; }

export function ClaimScoreExplanation() {
  return <p>Claims receive 0–4 points for their reported stage. Each distinct claim counts once. <Link href="/methodology#claim-points" className="text-primary-ink hover:underline">Scoring methodology</Link></p>;
}
export function ActionScoreExplanation() {
  return <p>Each topic averages its action claims: Commitment 25, Planned 50, Underway 75, Delivered 100. <Link href="/methodology#topics" className="text-primary-ink hover:underline">Topic methodology</Link></p>;
}
export function DocumentationLegend({metric="detail",scale="raw"}:{metric?:DashboardMetric;scale?:MetricScale}) {
  const count = isCountMetric(metric);
  return <div className="flex flex-col gap-3 text-[13px] leading-5 text-muted">
    <ScoreColorKey metric={metric} normalized={scale === "normalized"}/>

    <details>
    <summary className="flex w-fit cursor-pointer items-center gap-1.5 py-1 font-medium hover:text-foreground"><CircleHelp className="size-3.5" aria-hidden/>{metric === "detail" && scale === "raw" ? "How the score works" : "How to read this"}</summary>
    <div className="mt-2 flex max-w-3xl flex-col gap-2 leading-relaxed">    <p>{metric === "claim_points" ? "Claim points describe documented action and reported stages, not policy performance." : metric === "detail" ? "Higher scores mean later reported action stages. Context claims are excluded; each scored topic has equal weight in domain and country averages." : metric === "responses" ? "Action coverage is the share of topics with a documented response." : metric === "coverage" ? "Topic coverage includes concerns and background, as well as action claims." : "Claims can appear in several domains. Do not add domain counts into a country total."}</p>
      {scale === "normalized" && <NormalizationNote/>}
      {(scale === "normalized" || count) && <p>Each domain or topic uses its own regional reference. Patterned cells or bars mean comparison unavailable; they do not represent an average value or a measured zero.</p>}
      {metric === "claim_points" ? <ClaimScoreExplanation/> : count ? <p>{metric === "actions" ? "Action claims are grouped statements with at least one member at a selected claim stage. The default is 1–4: commitment, planned action, underway and delivered." : "Claims are grouped document statements, including concerns and background."} Counts show evidence volume, not policy strength. A group can appear under several topics or domains; do not add those counts together.</p> : <>
        {metric === "detail" ? <ActionScoreExplanation/> : <p>Coverage is the share of topics with extracted claims, including concerns and background. It measures breadth, not delivery.</p>}
      </>}
    </div>
  </details></div>;
}

export function DocumentationTiles({dashboard,base,metric="detail",scale="raw",references,stages=DEFAULT_ACTION_STAGES}:{dashboard:DocumentationDashboard;prefixes:Record<string,string>;base:string;metric?:DashboardMetric;scale?:MetricScale;references?:RegionalReferences;stages?:number[]}) {
  const normalized = scale === "normalized", count = isCountMetric(metric);
  const maximum = !normalized && count ? Math.max(1,...dashboard.domains.map(d=>metricValue(d,metric)??0)) : 100;
  return <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" aria-label="Policy domain dashboard">{dashboard.domains.map(d=>{
    const raw=metricValue(d,metric),ref=references?.domains[d.id],value=normalized?normalizedMetric(d,metric,ref,dashboard.demo):raw;
    const band=deviationBand(metricComplete(d,metric)?raw:null,ref);
    const palette=normalized||count?"compare":"doc";
    const tone=normalized||count?band.tone:metricTone(value,metric),color=tone==="unavailable"?"var(--data-unavailable)":`var(--${palette}-${tone})`;
    const emptyLabel=normalized?"Unavailable":metric==="detail"?documentationEmptyLabel(d.score):d.processingComplete?"Not assessed":processingLabel(d);
    const state=value!==null?"ready":!normalized&&metric==="detail"&&d.processingComplete&&d.actions===0?"no-action":"unavailable";
    const cardUnit=normalized||metric==="detail"?"/100":metric==="claim_points"?"points":metric==="coverage"?"topics":count?"claims":"%";
    const display=value!==null&&metric==="coverage"&&!normalized?`${d.topicsAddressed}/${d.topicCount}`:presentedScore(value,metric,normalized,metricUnit(metric,scale));
    const relativeLabel=band.tone==="neutral"?"Near regional average":band.tone.startsWith("below")?"Below regional average":band.tone.startsWith("above")?"Above regional average":"Comparison unavailable";
    return <li key={d.id}>
      <Link href={`${base}&domain=${encodeURIComponent(d.id)}&${metricQuery(metric,scale,stages)}`} className="policy-score-card" data-state={state}
        style={{"--mark":color,"--score-ink":tone==="unavailable"?"#111827":`var(--${palette}-${tone}-ink)`} as CSSProperties}
        aria-label={`${d.label}: ${value===null?emptyLabel:`${display} ${cardUnit}`} ${normalized?"normalized regional score":""}, ${d.findings} claims${normalized||count?", "+relativeLabel:""}`}>
        <span className="policy-score-name">{d.label}<ChevronRight size={15} aria-hidden/></span>
        <span className="policy-score-summary">
          <ScoreBadge value={display} unit={cardUnit} state={state} emptyLabel={state==="no-action"?"No action claims":emptyLabel}/>
          <span className="policy-score-context">{metric==="coverage"?`${d.findings} claims`:`${d.topicsAddressed}/${d.topicCount} topics covered`}</span>
        </span>
        {!normalized&&value!==null&&!metricComplete(d,metric)&&<span className="text-xs text-muted">{d.processingComplete?"Provisional":processingLabel(d)}</span>}
        <span className="policy-score-track" data-state={state} aria-hidden>{value!==null&&<i style={{width:`${Math.max(0,Math.min(100,100*value/maximum))}%`}}/>}</span>
      </Link>
    </li>;
  })}</ul>;
}

export function DocumentationOverview({dashboard,prefixes,iso3,metric="detail",scale="raw",stages=DEFAULT_ACTION_STAGES,references}:{dashboard:DocumentationDashboard;prefixes:Record<string,string>;iso3:string;metric?:DashboardMetric;scale?:MetricScale;stages?:number[];references?:RegionalReferences}) {
  const c=dashboard.country,base=`/countries/${iso3}?tab=domains`,raw=metricValue(c,metric),normalized=scale==="normalized";
  const value=normalized?normalizedMetric(c,metric,references?.country,dashboard.demo):raw,levels=c.score.distribution;
  const unknownTopics = Math.max(0, c.topicCount - c.score.assessedTopics);
  const contextTopics=c.topicsAddressed-c.topicsWithResponses,missingTopics=c.topicCount-c.topicsAddressed;
  const claimDistribution=metric==="claim_points"||metric==="claims";
  const distributionUnit=claimDistribution||metric==="actions"?"claims":"topics";
  const distributionTotal=claimDistribution?c.claimScore.totalClaims:metric==="actions"?c.findings:c.topicCount;
  const distributionTitle=claimDistribution?"Claims by stage":metric==="actions"?"Action claims":metric==="detail"?"Topics by score":"Topic coverage";
  const distribution: Array<DistributionSummaryRow & { detailLabel: string }> = claimDistribution
    ? ["Non-action","Commitment","Planned action","Underway","Delivered"].map((label,i)=>({label,detailLabel:`${label} · ${i} ${i===1?"point":"points"}`,value:c.claimScore.distribution[i],color:`var(--ladder-${i})`}))
    : metric==="actions"
      ? [{label:"Selected action claims",detailLabel:"Selected action claims",value:c.actions,color:"var(--scale-mid-high)"},{label:"Other claims",detailLabel:"Other claims",value:c.findings-c.actions,color:"var(--data-unavailable)"}]
      : metric==="coverage"||metric==="responses"
        ? [{label:"With action claims",detailLabel:"With action claims",value:c.topicsWithResponses,color:"var(--scale-high)"},{label:"Context only",detailLabel:"Context only",value:contextTopics,color:"var(--scale-mid)"},{label:"No claims found",detailLabel:"No claims found",value:missingTopics,color:"var(--data-unavailable)"}]
        : ["No action documented","Lower scores","Middle scores","Higher scores","Top score"].map((label,i)=>({label,detailLabel:DOCUMENTATION_RUBRIC.levels[i],value:levels[i],color:i===0?"var(--data-unavailable)":`var(--heat-${i+1})`}));
  if (claimDistribution&&c.claimScore.unresolvedClaims) distribution.push({label:"Unresolved",detailLabel:"Unresolved",value:c.claimScore.unresolvedClaims,color:"var(--data-unavailable)"});
  else if (metric==="detail"&&unknownTopics>0) distribution.push({label:"Not assessed",detailLabel:"Not assessed",value:unknownTopics,color:"var(--data-unavailable)"});
  const band=deviationBand(metricComplete(c,metric)?raw:null,references?.country);
  const regionalLabel=band.tone==="neutral"?"Near regional average":band.tone.startsWith("below")?"Below regional average":band.tone.startsWith("above")?"Above regional average":null;
  const scoreColor=normalized?`var(--compare-${band.tone})`:`var(--doc-${metricTone(value,metric)})`;
  const scoredLabel=metric==="claim_points"?`${c.claimScore.scoredClaims}/${c.claimScore.totalClaims} claims scored`:metric==="detail"?`${c.score.scoredTopics}/${c.topicCount} topics scored`:`${c.score.assessedTopics}/${c.topicCount} topics assessed`;
  const controls={pathname:`/countries/${iso3}`,fixed:{tab:"overview"},metric,scale,stages};
  const title=metricLabel(metric);
  return <div className="flex flex-col gap-5">
    {dashboard.demo&&<p className="text-sm text-warn-ink">Demo data · excluded from regional assessments</p>}
    <section className="rounded-xl border border-border bg-surface" aria-label="Country documentation overview">
      <div className="border-b border-border px-5 py-4">
        <h2 className="sr-only">{title}{normalized?" · Standardized regional score":""}</h2>
        <MetricControls {...controls} compact/>
      </div>
      <div className="grid md:grid-cols-[0.7fr_1.3fr]">
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
          <p className="flex flex-wrap items-baseline gap-2"><strong className="text-5xl font-semibold tracking-tight tabular">{formatMetric(value,metricUnit(metric,scale))}</strong><span className="text-base text-muted">{value===null?(normalized?"Unavailable":metric==="detail"?documentationEmptyLabel(c.score):"Not assessed"):metricUnit(metric,scale)}</span></p>
          {value!==null&&metricUnit(metric,scale)==="/100"&&<div className="mt-1 h-2 max-w-52 overflow-hidden rounded-full bg-surface-2" aria-hidden><div className="h-full rounded-full" style={{width:`${value}%`,background:scoreColor}}/></div>}
          {normalized?<p className="text-sm text-muted">50 = regional average</p>:metric==="detail"?<p className="text-sm text-muted">{scoredLabel}</p>:null}
          {(normalized||metric==="claim_points")&&regionalLabel&&<p className="text-sm text-muted">{regionalLabel}</p>}
          {!metricComplete(c,metric)&&<p className="text-xs text-muted"><span className="rounded bg-surface-2 px-2 py-1 font-medium">Provisional</span></p>}
        </div>
        <div className="border-t border-border p-5 sm:p-6 md:border-t-0 md:border-l">
          <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-sm font-medium">{distributionTitle}</h3><span className="text-xs text-muted">{distributionTotal} {distributionUnit}</span></div>
          <DistributionSummary rows={distribution} total={distributionTotal} unit={distributionUnit}/>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border px-5 py-4 text-sm sm:px-6">
        <Link href={`${base}&view=topics`} className="hover:text-primary-ink"><strong className="font-semibold tabular">{c.findings}</strong> <span className="text-muted">claims</span></Link>
        <Link href={`/countries/${iso3}?tab=overview&${metricQuery("actions",scale,stages)}`} className="hover:text-primary-ink"><strong className="font-semibold tabular">{c.actions}</strong> <span className="text-muted">action claims</span></Link>
        <Link href={`${base}&view=topics&filter=found`} className="hover:text-primary-ink"><strong className="font-semibold tabular">{c.topicsAddressed}/{c.topicCount}</strong> <span className="text-muted">topics covered</span></Link>
      </div>
      <details className="border-t border-border px-5 py-3 text-sm sm:px-6">
        <summary className="w-fit cursor-pointer text-muted hover:text-foreground">Details</summary>
        <div className="grid gap-6 py-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 text-xs leading-relaxed text-muted">
            <p>{scoredLabel}{metric==="claim_points"&&c.claimScore.unresolvedClaims?` · ${c.claimScore.unresolvedClaims} unresolved`:""}</p>
            {(normalized||metric==="claim_points")&&<><p>Raw {metricLabel(metric).toLowerCase()}: {formatMetric(raw,metricUnit(metric))}{metricUnit(metric)}</p><p>Regional average: {formatMetric(references?.country.mean??null,metricUnit(metric))} · {references?.country.countries??0} countries</p><p>{band.label}</p></>}
            {normalized&&<NormalizationNote/>}
            {normalized&&value===null&&<p>A complete assessment and at least two eligible countries are required.</p>}
            {metric==="detail"?<ActionScoreExplanation/>:claimDistribution?<ClaimScoreExplanation/>:metric==="actions"?<p>Action claims use the stages selected in Action definition.</p>:<p>Coverage counts topics with claims in the supplied documents.</p>}
            {metric==="detail"&&<p>Score bands: Lower 25–&lt;50 · Middle 50–&lt;75 · Higher 75–&lt;100 · Top 100. Band limits use unrounded scores.</p>}
          </div>
          <DistributionBars rows={distribution.map(row=>({...row,label:row.detailLabel}))} total={distributionTotal} unit={distributionUnit}/>
        </div>
      </details>
    </section>
    <ActionStageSettings {...controls}/>

    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link href={`${base}&view=topics&filter=context`} className="inline-flex items-center gap-1 text-muted hover:text-primary-ink"><strong className="font-medium text-foreground">{contextTopics}</strong> {contextTopics===1?"topic":"topics"} with context only <ChevronRight className="size-3.5" aria-hidden/></Link>
      <Link href={`${base}&view=topics&filter=none`} className="inline-flex items-center gap-1 text-muted hover:text-primary-ink"><strong className="font-medium text-foreground">{missingTopics}</strong> {missingTopics===1?"topic":"topics"} without claims <ChevronRight className="size-3.5" aria-hidden/></Link>
    </div>
    <h2 className="text-base font-semibold">Domains</h2>
    <DocumentationLegend metric={metric} scale={scale}/>
    {!normalized&&isCountMetric(metric)&&<p className="text-xs text-muted">Bars share a scale from 0 to {Math.max(1,...dashboard.domains.map(d=>metricValue(d,metric)??0))} {metric==="claim_points"?"points":"claims"}.</p>}
    <DocumentationTiles dashboard={dashboard} prefixes={prefixes} base={base} metric={metric} scale={scale} stages={stages} references={references}/>
  </div>;
}
