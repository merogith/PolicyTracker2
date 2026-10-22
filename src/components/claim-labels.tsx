import { FACETS, FACET_NAMES, labelName, type Classification } from "@/lib/labels";
import type { FindingCitation } from "@/lib/claim-presentation";
import { ReportLink as Link } from "@/components/report-link";

export function ClaimLabels({ classification:c, citations, iso3 }: { classification?:Classification; citations:FindingCitation[]; iso3:string }) {
  if (!c) return null;
  function evidence(quotes:string[]) {
    return <span className="inline-flex flex-wrap gap-1">{quotes.map((quote,i)=>{
      const normal=(value:string)=>value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
      const source=citations.find(c=>normal(c.quote).includes(normal(quote)));
      return source ? <Link key={i} title={quote} href={`/countries/${iso3}/documents/${source.documentId}?page=${source.page}&cite=${source.id}#viewer`} className="text-primary-ink hover:underline">p. {source.page}</Link> : <span key={i} title={quote} className="text-muted">Source excerpt: “{quote}”</span>;
    })}</span>;
  }
  return <details className="text-xs">
    <summary className="w-fit cursor-pointer py-1 text-muted hover:text-foreground">Labels and conditions</summary>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      <div><dt className="text-muted">Statement type</dt><dd className="mt-1">{labelName(c.statement_type.value)} · {evidence(c.statement_type.quotes)}</dd></div>
      {FACETS.filter(f=>c.labels[f].length>0).map(f=><div key={f}><dt className="text-muted">{FACET_NAMES[f]}</dt><dd className="mt-1 flex flex-wrap gap-2">{c.labels[f].map(l=><span key={l.value}>{labelName(l.value)} · {evidence(l.quotes)}</span>)}</dd></div>)}
    </dl>
    {!!c.facts.length&&<div className="mt-4 flex flex-col gap-3"><h5 className="font-semibold">Facts and targets</h5>{c.facts.map((fact,i)=><div key={i} className="border-l-2 border-primary/30 pl-3">
      <p className="font-medium">{labelName(fact.fact_type)}{fact.target_kind&&` · ${labelName(fact.target_kind)}`}</p>
      <p className="mt-1 leading-relaxed">{fact.text}</p>
      <p className="mt-1 text-muted">{[fact.metric,fact.value_as_stated,fact.unit,fact.period&&`Period: ${fact.period}`,fact.baseline_as_stated&&`Baseline: ${fact.baseline_as_stated}`,...["comparator","direction","basis","total_or_additional","conditionality","finance_status"].flatMap(key=>{const value=fact[key as keyof typeof fact];return typeof value==="string"&&value!=="not_stated"?[`${labelName(key)}: ${labelName(value)}`]:[];})].filter(Boolean).join(" · ")}</p>{evidence(fact.quotes)}
    </div>)}</div>}
    {!!c.actors.length&&<p className="mt-3"><strong>Actors: </strong>{c.actors.map((a,i)=><span key={i}>{i>0&&"; "}{a.name} ({labelName(a.role)}) · {evidence(a.quotes)}</span>)}</p>}
    {c.priority&&<p className="mt-3"><strong>Explicit source priority: </strong>“{c.priority.text}” · {evidence(c.priority.quotes)}</p>}
  </details>;
}
