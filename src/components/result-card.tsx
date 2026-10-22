import { AlertTriangle, CheckCircle2, Clock, Loader2, SearchX } from "lucide-react";
import type { Citation } from "@/generated/prisma/client";
import { type FindingFigure, type SupportingFinding } from "@/lib/claim-presentation";
import { groupStatementType } from "@/lib/statement-types";
import { claimScore } from "@/lib/claim-score";
import type { Unit } from "@/lib/topic-merge";
import type { CardData } from "@/lib/views";
import { isDemoSource } from "@/lib/ai-mode";
import { ActionButton } from "./action-button";
import { TopicChip } from "./domains-view";
import { CitationEvidence, ClaimDetails, ClaimPoints, FindingFigures, FindingStage, SupportingFindings } from "./claim-details";
import { ClaimLabels } from "./claim-labels";
import { readClassification } from "@/lib/labels";

type Json = Record<string, unknown>;

function Answer({
  output,
  cites,
  topicsOf,
  iso3,
  country,
  supportingFindings = {},
}: {
  output: Json;
  cites: (path: string) => Citation[];
  topicsOf: (path: string, item: Json) => string[];
  iso3: string;
  country: boolean;
  supportingFindings?: Record<string, SupportingFinding[]>;
}) {
  const topics = (path: string, item: Json) => {
    const ids = topicsOf(path, item);
    const unmapped = (item.unmapped_concepts as string[] | undefined) ?? [];
    if (ids.length === 0 && unmapped.length === 0) return null;
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-1">
        {ids.map((id) => (
          <TopicChip key={id} id={id} iso3={iso3} />
        ))}
        {unmapped.length > 0 && <span className="text-xs text-muted">no topic for: {unmapped.join("; ")}</span>}
      </p>
    );
  };
  const findings = (output.findings as Json[]) ?? [];
  return (
    <ul className="flex flex-col divide-y divide-border">
      {findings.map((it, i) => {
        const figures = (it.figures as FindingFigure[]) ?? [];
        const supporting = supportingFindings[`findings.${i}`] ?? [];
        const citations = cites(`findings.${i}`);
        const classification = readClassification(it);
        const unit: Unit = {
          domainId: "", domainLabel: "", path: `findings.${i}`, text: String(it.text), kind: typeof it.kind === "string" ? it.kind : null,
          topics: topicsOf(`findings.${i}`,it), citations, supportingFindings: supporting,
          classifications: classification ? [{sourceId:`findings.${i}`,documentId:citations[0]?.documentId??"",classification}] : [],
        };
        return (
          <li key={i} className="py-1 first:pt-0 last:pb-0">
            <ClaimDetails
              title={it.title as string | undefined}
              summary={it.summary as string | undefined}
              text={it.text as string}
              relatedCount={supporting.length}
              stage={<><FindingStage kind={groupStatementType([unit])} />{supporting.length<=1&&<ClaimPoints score={claimScore([unit])}/>}</>}
              sourceCount={new Set(citations.map((c) => c.documentId)).size}
              citationCount={citations.length}
            >
              {topics(`findings.${i}`, it)}
              {supporting.length > 0 ? <SupportingFindings findings={supporting} iso3={iso3} shownTexts={[String(it.text),String(it.summary??"")]} shownTitles={[String(it.title??"")]} /> : <>
                <FindingFigures figures={figures} />
                <ClaimLabels classification={readClassification(it)} citations={citations} iso3={iso3} />
                <CitationEvidence citations={citations} iso3={iso3} showDocument={country} />
              </>}
              {supporting.length > 0 && citations.some(c => !supporting.some(f => f.citations.some(s => s.documentId === c.documentId && s.page === c.page && s.quote === c.quote))) && (
                <div className="flex flex-col gap-2"><p className="text-xs text-muted">Additional stored evidence</p>
                  <CitationEvidence citations={citations.filter(c => !supporting.some(f => f.citations.some(s => s.documentId === c.documentId && s.page === c.page && s.quote === c.quote)))} iso3={iso3} />
                </div>
              )}
            </ClaimDetails>
          </li>
        );
      })}
    </ul>
  );
}

export function ResultCard({
  card,
  iso3,
  rerun,
  anchor,
  showRaw = false,
}: {
  card: CardData;
  iso3: string;
  rerun: { documentId?: string; countryId?: string };
  anchor: string;
  showRaw?: boolean;
}) {
  const { domain, result, stale, retagPending, pending, error } = card;
  const country = result?.scope === "country";
  const output = (result?.output ?? null) as Json | null;
  const cites = (path: string) => (result?.citations ?? []).filter((c) => c.itemPath === path);
  const sources = (result?.sources ?? {}) as { pagesRead?: number[]; totalPages?: number; indexedPages?: number; documentsWithoutAnswer?: string[]; labeling?: { status: string; classified?: number; total?: number } };
  // Document findings carry their own topic tags; country findings take theirs from the document findings they cite.
  const topicsOf = (path: string, item: Json) => (country ? (card.findingTopics?.[path] ?? []) : ((item.topic_ids as string[] | undefined) ?? []));
  const verified = result?.citations.filter((c) => c.verified).length ?? 0;
  const total = result?.citations.length ?? 0;

  return (
    <article id={anchor} className="claim-section flex scroll-mt-28 flex-col overflow-hidden rounded-xl border border-border bg-surface lg:scroll-mt-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="min-w-0">
            <h3 className="text-[15px] leading-snug font-semibold">{domain.label}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {output && !output.not_found ? `${((output.findings as Json[]) ?? []).length} claims` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isDemoSource(result?.sources) && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn-ink">Demo</span>}
          {sources.labeling && sources.labeling.status !== "complete" && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn-ink">Classification incomplete</span>}
          {stale && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn-ink">Update needed</span>}
          {retagPending && !stale && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn-ink" title="Tagged with an older taxonomy version; a re-tag is queued or needed">Topics being updated</span>}
          {pending === "running" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-ink">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Running
            </span>
          )}
          {pending === "queued" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
              <Clock className="size-3" aria-hidden /> Queued
            </span>
          )}
          {error && !pending && <span className="rounded-full bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad-ink">Failed</span>}
          <ActionButton url="/api/results/rerun" body={{ ...rerun, domainId: domain.id }} label="Re-run" icon="rerun" variant="ghost" size="sm" title={`Ask "${domain.label}" again`} />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {error && !pending && <p className="rounded-md bg-bad-soft px-2 py-1.5 text-xs text-bad-ink">{error}</p>}
        {!output ? (
          <p className="text-sm text-muted">{pending ? "Waiting for the analysis…" : error ? "No answer yet." : "Not run yet."}</p>
        ) : output.not_found ? (
          <div className="flex items-start gap-2 text-sm text-muted">
            <SearchX className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-foreground">Not found in the pages read.</p>
              {typeof output.note === "string" && <p className="mt-1 text-xs">{output.note}</p>}
            </div>
          </div>
        ) : (
          <>
            <Answer output={output} cites={cites} topicsOf={topicsOf} iso3={iso3} country={country} supportingFindings={card.supportingFindings} />
            {typeof output.note === "string" && output.note && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer hover:text-foreground">Analysis notes</summary>
                <p className="mt-2 leading-relaxed">{output.note}</p>
              </details>
            )}
          </>
        )}

        {!country && output && Array.isArray(sources.pagesRead) && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer hover:text-foreground">Source coverage · {sources.pagesRead.length} pages returned</summary>
            <p className="mt-2 leading-relaxed">
              {typeof sources.indexedPages === "number" && <>{sources.indexedPages} of {sources.totalPages} pages indexed. </>}
              Pages returned: {sources.pagesRead.length ? sources.pagesRead.join(", ") : "none"}.
            </p>
          </details>
        )}

        {country && output && !output.not_found && (
          <details className="rounded-lg bg-surface-2 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Document comparison & edition notes</summary>
            <div className="mt-3 flex flex-col gap-3">
            {((output.by_document as Json[]) ?? []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold">By document</h4>
                <ul className="mt-1 flex flex-col gap-1">
                  {(output.by_document as Json[]).map((b, i) => (
                    <li key={i} className="text-xs leading-snug">
                      <span className="font-mono font-medium">{b.document_id as string}</span> {b.summary as string}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {((output.changes_between_editions as Json[]) ?? []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold">Changes between editions</h4>
                <ul className="mt-1 flex flex-col gap-1">
                  {(output.changes_between_editions as Json[]).map((c, i) => (
                    <li key={i} className="text-xs leading-snug">
                      {c.text as string} <span className="font-mono text-muted">({(c.document_ids as string[]).join(", ")})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(sources.documentsWithoutAnswer ?? []).length > 0 && (
              <p className="text-xs text-warn-ink">No document answer yet for: {sources.documentsWithoutAnswer!.join(", ")}</p>
            )}
            </div>
          </details>
        )}
      </div>

      {result && (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted">
          <span className={`inline-flex items-center gap-1 ${!total ? "text-muted" : verified < total ? "text-bad-ink" : "text-ok-ink"}`}>
            {total && verified < total ? <AlertTriangle className="size-3" aria-hidden /> : <CheckCircle2 className="size-3" aria-hidden />}
            {verified}/{total} quotes matched
          </span>
          <details className="ml-auto">
            <summary className="cursor-pointer hover:text-foreground">Run details</summary>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{result.model}</span>
              <span className="tabular">{isDemoSource(result.sources) ? "Demo · $0.0000" : `$${result.costUsd.toFixed(4)} estimated`}</span>
              <span>Question v{result.domainVersion}</span>
              {result.finishedAt && <span className="tabular">{result.finishedAt.toISOString().slice(0, 16).replace("T", " ")}</span>}
            </div>
          </details>
        </footer>
      )}
      {showRaw && result && (
        <details className="border-t border-border px-4 py-2 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">Raw JSON</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-surface-2 p-2">{JSON.stringify(result.output, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}
