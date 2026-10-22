"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, FileText } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { findingStatementType, statementTypeLabel, statementTypePoints } from "@/lib/statement-types";
import { claimScore, type ClaimScore } from "@/lib/claim-score";
import type { Unit } from "@/lib/topic-merge";
import { figureDisplay, type FindingCitation, type FindingFigure, type SupportingFinding } from "@/lib/claim-presentation";
import { ClaimLabels } from "./claim-labels";

/** The short heading is independent of the complete claim and original evidence. */
export function ClaimDetails({
  title, summary, text, stage, sourceCount, citationCount, relatedCount = 0, children, open, onOpenChange,
}: {
  title?: string; summary?: string; text: string; stage: React.ReactNode;
  sourceCount: number; citationCount: number; relatedCount?: number; children: React.ReactNode;
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const hasTitle = Boolean(title?.trim());
  return (
    <details open={open} onToggle={onOpenChange ? event => onOpenChange(event.currentTarget.open) : undefined} className="group/claim min-w-0 rounded-lg open:bg-surface-2/50">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={hasTitle ? "text-[15px] font-semibold leading-snug text-foreground" : "text-sm leading-relaxed text-foreground"}>{hasTitle ? title : text}</span>
          {hasTitle && summary && <span className="text-sm leading-relaxed text-muted group-open/claim:hidden">{summary}</span>}
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {stage}
            <span className="inline-flex items-center gap-1"><FileText className="size-3" aria-hidden />{sourceCount} {sourceCount === 1 ? "document" : "documents"}</span>
            <span>{citationCount} {citationCount === 1 ? "quote" : "quotes"}</span>
            {relatedCount > 0 && <span>{relatedCount} supporting {relatedCount === 1 ? "finding" : "findings"}</span>}
          </span>
        </span>
        <ChevronDown className="mt-1 size-4 shrink-0 text-muted transition-transform group-open/claim:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="mx-2 flex min-w-0 flex-col gap-4 border-t border-border pt-4 pb-3">
        {hasTitle && <p className="text-sm leading-relaxed text-foreground">{text}</p>}
        {children}
      </div>
    </details>
  );
}

export function FindingStage({ kind }: { kind: string | null }) {
  const points = statementTypePoints(kind);
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium"
    title={kind === "mixed" ? "The supporting findings have different statement types; each is shown below." : kind === "other" ? "No predefined statement type fits. This does not mean missing labels." : "Statement type reported by the source; not independent verification."}>
    <span className="size-2 rounded-[2px]" style={{ background: points === null ? "var(--ladder-other)" : `var(--ladder-${points})` }} aria-hidden />
    {statementTypeLabel(kind)}
  </span>;
}

export function ClaimPoints({ score }: { score: ClaimScore }) {
  return <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-ink tabular" title={score.reason}>
    {score.points === null ? "Points unresolved" : `${score.points > 0 ? "+" : ""}${score.points} ${score.points === 1 ? "point" : "points"}`}
  </span>;
}

export function FindingFigures({ figures }: { figures: FindingFigure[] }) {
  if (!figures.length) return null;
  return <dl className="grid gap-x-5 gap-y-2 rounded-md border border-border bg-surface px-3 py-2.5 text-xs sm:grid-cols-2">
    {figures.map((figure, i) => {
      const display = figureDisplay(figure);
      return <div key={i} className="min-w-0">
        <dt className="font-medium text-muted">{display.label}</dt>
        <dd className="mt-0.5 leading-relaxed text-foreground">{display.value}
          {display.period && <span className="text-muted"> · Period: {display.period}</span>}
          {display.condition && <span className="text-muted"> · {display.condition}</span>}
        </dd>
      </div>;
    })}
  </dl>;
}

const normalizedText = (value: string) => value.normalize("NFKC").replace(/\s+/g," ").trim();
const citationKey = (citation: FindingCitation) => `${citation.documentId}:${citation.page}:${normalizedText(citation.quote)}`;
const figureKey = (figure: FindingFigure) => JSON.stringify(figureDisplay(figure));

/** Show source evidence once, retaining any evidence only attached to the combined statement. */
export function FindingEvidence({unit,iso3}:{unit:Unit;iso3:string}) {
  const findings=unit.supportingFindings??[];
  if(!findings.length) return <><FindingFigures figures={unit.figures??[]}/><CitationEvidence citations={unit.citations} iso3={iso3}/></>;
  const quotes=new Set(findings.flatMap(f=>f.citations.map(citationKey)));
  const figures=new Set(findings.flatMap(f=>f.figures.map(figureKey)));
  const additional=unit.citations.filter(c=>!quotes.has(citationKey(c)));
  return <>
    <SupportingFindings findings={findings} iso3={iso3} shownTexts={[unit.text,unit.summary??""]} shownTitles={[unit.title??""]}/>
    <FindingFigures figures={(unit.figures??[]).filter(f=>!figures.has(figureKey(f)))}/>
    {!!additional.length&&<CitationEvidence citations={additional} iso3={iso3}/>}
  </>;
}

export function SupportingFindings({ findings, iso3, shownTexts=[], shownTitles=[] }: { findings: SupportingFinding[]; iso3: string; shownTexts?:string[]; shownTitles?:string[] }) {
  if (!findings.length) return null;
  const texts=new Set(shownTexts.map(normalizedText)), titles=new Set(shownTitles.map(normalizedText));
  const quotes=new Set<string>(), figures=new Set<string>();
  const unique=<T,>(items:T[],seen:Set<string>,key:(value:T)=>string)=>items.filter(item=>{
    const id=key(item); if(seen.has(id)) return false; seen.add(id); return true;
  });
  return <div className="flex flex-col gap-4">
    {findings.map(finding => {
      const title=unique(finding.title?[finding.title]:[],titles,normalizedText)[0];
      const text=unique([finding.text],texts,normalizedText)[0];
      const citations=unique(finding.citations,quotes,citationKey);
      const values=unique(finding.figures,figures,figureKey);
      return <section key={finding.id} className="flex min-w-0 flex-col gap-3">
      {findings.length>1&&<div className="flex flex-wrap items-center gap-2">
        <FindingStage kind={findingStatementType(finding)} />
        <ClaimPoints score={claimScore([{ domainId:"",domainLabel:"",path:finding.id, ...finding, topics: [], supportingFindings:[finding] } satisfies Unit])} />
        <span className="text-xs text-muted">{finding.documentId}</span>
      </div>}
      {title && <h4 className="text-sm font-semibold leading-snug">{title}</h4>}
      {text && <p className="text-sm leading-relaxed">{text}</p>}
      <FindingFigures figures={values} />
      {!!citations.length&&<CitationEvidence citations={citations} iso3={iso3} />}
      <ClaimLabels classification={finding.classification} citations={finding.citations} iso3={iso3} />
    </section>;})}
  </div>;
}

/** Exact quotations and original-page links remain available together, with no content quota. */
export function CitationEvidence({ citations, iso3, showDocument = true }: { citations: FindingCitation[]; iso3: string; showDocument?: boolean }) {
  if (citations.length === 0) return <p className="text-xs text-muted">No source quote is attached to this finding.</p>;
  return (
    <ul className="flex min-w-0 flex-col gap-2.5" aria-label="Source evidence">
      {citations.map((c) => (
        <li key={c.id} className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/countries/${iso3}/documents/${c.documentId}?page=${c.page}&cite=${c.id}#viewer`}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular transition-colors ${c.verified ? "bg-primary-soft text-primary-ink hover:bg-primary hover:text-white" : "bg-bad-soft text-bad-ink hover:brightness-95"}`}
              title={c.verified ? "Open the page with this quote highlighted" : "Open the cited page; this quote was not matched automatically"}>
              {c.verified ? <CheckCircle2 className="size-3" aria-hidden /> : <AlertTriangle className="size-3" aria-hidden />}
              {showDocument ? `${c.documentId} · ` : ""}p. {c.page}
            </Link>
            <span className={c.verified ? "text-muted" : "text-bad-ink"}>{c.verified ? "Text matched" : "Text not matched"}</span>
            {c.verified && c.citedPage !== undefined && c.page !== c.citedPage && <span className="text-muted">Cited as p. {c.citedPage}</span>}
          </div>
          <blockquote className="mt-2 text-sm leading-relaxed break-words text-muted">“{c.quote}”</blockquote>
        </li>
      ))}
    </ul>
  );
}
