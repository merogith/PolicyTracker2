import { AlertTriangle } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { DEFAULT_ACTION_STAGES, deviationBand, metricComplete, formatMetric, metricQuery, normalizedMetric, type DashboardMetric, type MetricScale, type RegionalReferences, type RegionalReference } from "@/lib/dashboard-metrics";
import { loadTaxonomyCached } from "@/lib/taxonomy";
import { type CountryTopics, type MergedItem } from "@/lib/topics";
import { buildDocumentationDashboard, documentationBand, processingLabel, type DocumentationDashboard, type DocumentationTopic } from "@/lib/documentation-score";
import { documentationEmptyLabel } from "@/lib/documentation-stage";
import { BUCKETS, bucket } from "./charts/coverage-heatmap";
import { KindDot } from "./charts/kind";
import { ActionScoreExplanation, ClaimScoreExplanation, DocumentationLegend, DocumentationTiles } from "./charts/documentation-dashboard";
import { MetricControls } from "./charts/metric-controls";
import { ChartTooltips } from "./charts/tooltip";
import { Section } from "./section";
import { plural } from "@/lib/plural";
import { CitationEvidence, ClaimDetails, ClaimPoints, FindingFigures, FindingStage, SupportingFindings } from "./claim-details";
import { uniqueSupportingFindings } from "@/lib/claim-presentation";
import { groupStatementType } from "@/lib/statement-types";
import { claimScore } from "@/lib/claim-score";
import { relatedTopics } from "@/lib/topic-inventory";


function PrefixMark({ prefix }: { prefix: string }) {
  return <span className="w-9 shrink-0 rounded bg-surface-2 px-1 py-0.5 text-center font-mono text-xs font-semibold text-muted">{prefix}</span>;
}

export function DomainsView({
  data,
  iso3,
  domainId,
  topicId,
  view,
  filter,
  dashboard,
  stages = DEFAULT_ACTION_STAGES,
  metric = "claim_points", scale = "raw", references, claimReferences,
}: {
  data: CountryTopics;
  iso3: string;
  domainId?: string;
  topicId?: string;
  view?: string;
  filter?: string;
  dashboard?: DocumentationDashboard;
  stages?: number[];
  metric?: DashboardMetric; scale?: MetricScale; references?: RegionalReferences; claimReferences?: RegionalReferences;
}) {
  const base = `/countries/${iso3}?tab=domains&${metricQuery(metric,scale,stages)}`;
  if (!data.ready) return <p className="text-sm text-muted">Domain and topic views will appear as document summaries finish.</p>;
  const assessment = dashboard ?? buildDocumentationDashboard(data, undefined, stages);
  const outdated = data.outdated > 0 ? (
    <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {plural(data.outdated, "answer")} {data.outdated === 1 ? "uses" : "use"} an earlier prompt. Refresh the documents to update them.
    </p>
  ) : null;
  const t = topicId && assessment.topics.some((row) => row.id === topicId) ? data.tax.topic(topicId) : undefined;
  if (t) return <TopicDetail data={data} dashboard={assessment} iso3={iso3} topicId={t.id} base={base} outdated={outdated} reference={claimReferences?.topics[t.id]} />;
  const d = domainId && assessment.domains.some((row) => row.id === domainId) ? data.tax.domain(domainId) : undefined;
  if (d) return <DomainDetail data={data} dashboard={assessment} iso3={iso3} domainId={d.id} base={base} outdated={outdated} references={claimReferences} />;
  const seg = (on: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${on ? "bg-surface text-primary-ink shadow-card" : "text-muted hover:text-foreground"}`;
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Domains view" className="flex w-fit max-w-full gap-1 rounded-lg bg-surface-2 p-1">
        <Link href={base} className={seg(view !== "topics")} aria-current={view !== "topics" ? "page" : undefined}>Domains</Link>
        <Link href={`${base}&view=topics`} className={seg(view === "topics")} aria-current={view === "topics" ? "page" : undefined}>All {assessment.topics.length} topics</Link>
      </nav>
      {outdated}
      <MetricControls pathname={`/countries/${iso3}`} fixed={{tab:"domains",view:view??""}} metric={metric} scale={scale} stages={stages}/>
      {view === "topics" ? <TopicStatusTable dashboard={assessment} data={data} base={base} filter={filter} references={claimReferences} /> : (
        <>
          <DocumentationLegend metric={metric} scale={scale}/>
          <DocumentationTiles dashboard={assessment} prefixes={Object.fromEntries(data.tax.domains.map((domain) => [domain.id, domain.prefix]))} base={base} metric={metric} scale={scale} references={references} stages={stages}/>
          <details className="panel px-5 py-4">
            <summary className="cursor-pointer text-sm font-semibold">Compare document coverage</summary>
            <div className="mt-4"><DomainGrid data={data} iso3={iso3} base={base} /></div>
          </details>
          {(data.untagged.length > 0 || data.unmapped.length > 0) && (
            <details className="panel px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold">Outside the current topics · {data.untagged.length} findings</summary>
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-xs text-muted">Evidence stays available here when no current topic fits.</p>
                {data.unmapped.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {data.unmapped.map((u) => (
                      <li key={u.concept} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs" title={u.documents.join(", ")}>{u.concept}</li>
                    ))}
                  </ul>
                )}
                {data.untagged.length > 0 && <MergedList items={data.untagged} iso3={iso3} />}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/** Kept as an export for existing callers; stage points are not shown as policy-detail scores. */
export function ScoreReading({ data }: { data: Pick<CountryTopics, "rubric"> }) {
  return (
    <aside className="panel flex flex-col gap-3 p-5 text-sm" data-legacy-rubric={data.rubric.id}>
      <h2 className="text-base font-semibold">Reading the dashboard</h2>
      <p className="text-muted">Topic coverage shows where extracted findings are present. It does not measure implementation or policy quality.</p>
      <ActionScoreExplanation />
      <p className="text-xs text-muted">A dash means the topic has not been assessed with a source-matched quotation.</p>
    </aside>
  );
}

function TopicMetricsTable({ rows, base, homeLabels, references }: { rows: DocumentationTopic[]; base: string; homeLabels?: Record<string, string>; references?: RegionalReferences }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[31rem] text-sm">
        <thead className="border-y border-border bg-surface-2/60 text-left text-xs text-muted">
          <tr>
            <th scope="col" className="min-w-52 px-4 py-3 font-medium">Topic</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Claims</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Action claims</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Claim points</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Standardized regional score</th>
            <th scope="col" className="px-3 py-3 text-center font-medium">Average action stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const band = deviationBand(metricComplete(row,"claim_points")?row.claimScore.value:null,references?.topics[row.id]);
            const stageTone = documentationBand(row.score.value).tone;
            return (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
              <th scope="row" className="px-4 py-3 text-left font-normal">
                <Link href={`${base}&topic=${row.id}`} className="group/topic flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="font-mono">{row.id}</span>
                    <span className="inline-flex items-center gap-1.5 font-normal">
                      <span className="size-1.5 rounded-full" style={{ background: row.responses > 0 ? "var(--ladder-3)" : row.findings > 0 ? "var(--ladder-0)" : "var(--data-unavailable)" }} aria-hidden />
                      {row.responses > 0 ? "Action documented" : row.findings > 0 ? "Context documented" : "No findings yet"}
                    </span>
                  </span>
                  <span className="font-medium group-hover/topic:text-primary-ink group-hover/topic:underline">{row.label} <span className="text-muted" aria-hidden>↗</span></span>
                  {homeLabels && row.homeDomainId && <span className="text-xs text-muted">Home: {homeLabels[row.homeDomainId]}</span>}
                </Link>
              </th>
              <td className="px-3 py-3 text-right tabular">{row.findings}</td>
              <td className="px-3 py-3 text-right tabular">{row.actions}</td>
              <td className="px-3 py-3 text-right font-semibold tabular">{formatMetric(row.claimScore.value)}{!row.claimScore.complete&&<span className="block text-xs font-normal text-muted">Provisional · {row.claimScore.unresolvedClaims} unresolved</span>}</td>
              <td className="px-3 py-3 text-right tabular"><span className="inline-block rounded px-2 py-1 font-semibold" style={{background:`var(--compare-${band.tone}-soft)`,color:`var(--compare-${band.tone}-ink)`}} title={band.label}>{formatMetric(normalizedMetric(row,"claim_points",references?.topics[row.id]),"/100")}</span><span className="block text-xs text-muted">/100</span></td>
              <td className="px-3 py-3 text-center font-semibold tabular" title={row.score.reason}>{row.score.value === null ? <span className="text-xs font-normal text-muted">{documentationEmptyLabel(row.score)}</span> : <><span className="inline-block rounded px-2 py-1" style={{background:`var(--doc-${stageTone}-soft)`,color:`var(--doc-${stageTone}-ink)`}}>{formatMetric(row.score.value,"/100")}</span><span className="block text-xs font-normal text-muted">/100</span></>}<span className="mt-1 block text-xs font-normal text-muted">{row.score.complete ? "" : "Provisional"}</span></td>
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
}

function TopicTableLegend() {
  return <p className="border-t border-border px-4 py-3 text-xs text-muted"><Link href="/methodology#topics" className="hover:text-primary-ink hover:underline">About topic scores</Link></p>;
}

function AssessmentNote({ dashboard }: { dashboard: DocumentationDashboard }) {
  return (
    <details className="border-t border-border px-4 py-3 text-xs text-muted">
      <summary className="w-fit cursor-pointer hover:text-foreground">About these scores</summary>
      <div className="mt-2 flex flex-col gap-2 leading-relaxed">
        <ClaimScoreExplanation />
        <ActionScoreExplanation />
        <p>Action claims are statements tagged as commitments, planned actions, underway or delivered. These are documented statements, not independent verification of delivery.</p>
        <p>{dashboard.countNote}</p>
      </div>
    </details>
  );
}

/** Every topic appears once, under its home domain. */
function TopicStatusTable({ dashboard, data, base, filter, references }: { dashboard: DocumentationDashboard; data: CountryTopics; base: string; filter?: string; references?: RegionalReferences }) {
  const rows = dashboard.topics.filter((t) => filter === "found" ? t.findings > 0 : filter === "none" ? t.findings === 0 : filter === "context" ? t.findings > 0 && t.responses === 0 : filter === "responses" ? t.responses > 0 : true);
  const pill = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-foreground"}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{dashboard.country.topicsWithResponses}/{dashboard.country.topicCount} topics with action claims · {dashboard.country.topicsAddressed} with any findings.</p>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter topics">
          <Link href={`${base}&view=topics`} className={pill(!filter)}>All</Link>
          <Link href={`${base}&view=topics&filter=responses`} className={pill(filter === "responses")}>With action claims</Link>
          <Link href={`${base}&view=topics&filter=context`} className={pill(filter === "context")}>Context only</Link>
          <Link href={`${base}&view=topics&filter=found`} className={pill(filter === "found")}>With findings</Link>
          <Link href={`${base}&view=topics&filter=none`} className={pill(filter === "none")}>No findings</Link>
        </div>
      </div>
      {data.tax.domains.filter((domain) => domain.enabled).map((domain) => {
        const domainRows = rows.filter((row) => row.homeDomainId === domain.id);
        if (!domainRows.length) return null;
        return (
          <section key={domain.id} className="panel overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold">
              <Link href={`${base}&domain=${domain.id}`} className="inline-flex items-center gap-2 hover:text-primary-ink"><PrefixMark prefix={domain.prefix} /> {domain.label}</Link>
            </h2>
            <TopicMetricsTable rows={domainRows} base={base} references={references}/>
          </section>
        );
      })}
      {rows.length === 0 && <p className="panel px-5 py-4 text-sm text-muted">No topics match this filter.</p>}
      <div className="panel"><TopicTableLegend /><AssessmentNote dashboard={dashboard} /></div>
    </div>
  );
}

function DomainGrid({ data, iso3, base }: { data: CountryTopics; iso3: string; base: string }) {
  if (data.documents.length === 0) return <p className="text-sm text-muted">No documents yet.</p>;
  return (
    <figure className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] leading-5 text-foreground" aria-label="Legend">
        <li>Items tagged:</li>
        {BUCKETS.map((b, i) => (
          <li key={b.label} className="flex items-center gap-1">
            <span className="size-4 shrink-0 rounded-[3px] ring-1 ring-inset ring-foreground/15" style={{ background: `var(--heat-${i + 1})` }} aria-hidden />
            {b.label}
          </li>
        ))}
        <li>· none</li>
      </ul>
      <ChartTooltips className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[13px]">
          <thead>
            <tr>
              <th className="w-56 text-left font-medium text-muted">Domain</th>
              {data.documents.map((d) => (
                <th key={d.id} className="min-w-24 px-1 pb-1 text-center font-medium">
                  <Link href={`/countries/${iso3}?tab=${d.id}`} className="inline-flex flex-col items-center gap-0.5 hover:underline">
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <KindDot kind={d.kind} /> {d.id}
                    </span>
                    <span className="font-normal text-muted">{d.editionDate.slice(0, 7)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.tax.domains.filter((dom) => dom.enabled).map((dom) => (
              <tr key={dom.id}>
                <th scope="row" className="pr-2 text-left font-normal">
                  <Link href={`${base}&domain=${dom.id}`} className="flex items-center gap-2 text-[13px] hover:underline">
                    <PrefixMark prefix={dom.prefix} />
                    <span className="truncate">{dom.label}</span>
                  </Link>
                </th>
                {data.docDomains.map((dd) => {
                  const n = dd.perDomain.get(dom.id) ?? 0;
                  const b = n ? bucket(n) : 0;
                  return (
                    <td key={dd.document.id} className="p-0">
                      <span
                        tabIndex={0}
                        data-tip-value={n ? `${n} item${n === 1 ? "" : "s"}` : "None"}
                        data-tip-label={`${dom.label} · ${dd.document.id}`}
                        aria-label={`${dom.label} in ${dd.document.id}: ${n} items`}
                        className="flex h-7 items-center justify-center rounded-[4px] font-semibold tabular"
                        style={b ? { background: `var(--heat-${b})`, color: `var(--heat-ink-${b})` } : { background: "var(--surface-2)" }}
                      >
                        {n || <span className="font-normal text-muted">·</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ChartTooltips>
      <figcaption className="text-xs text-muted">Document findings include home and related topics, before country summaries combine them. These counts are broader than dashboard home-topic counts. A finding can appear in several domains.</figcaption>
    </figure>
  );
}

function DomainDetail({ data, dashboard, iso3, domainId, base, outdated, references }: { data: CountryTopics; dashboard: DocumentationDashboard; iso3: string; domainId: string; base: string; outdated: React.ReactNode; references?: RegionalReferences }) {
  const domain = data.tax.domain(domainId)!;
  const summary = dashboard.domains.find((row) => row.id === domain.id);
  const homeTopics = dashboard.topics.filter((row) => row.homeDomainId === domain.id);
  const relatedInventory = relatedTopics(data.tax.topics, domain.id);
  const linkedIds = new Set(relatedInventory.map(topic => topic.id));
  const linkedTopics = dashboard.topics.filter((row) => linkedIds.has(row.id));
  const excludedRelated = relatedInventory.filter(topic => !linkedTopics.some(row => row.id === topic.id));
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Domain breadcrumb" className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <Link href={`/countries/${iso3}`} className="hover:text-primary-ink">Country overview</Link><span aria-hidden>›</span>
        <Link href={base} className="hover:text-primary-ink">All domains</Link><span aria-hidden>›</span><span>{domain.label}</span>
      </nav>
      {outdated}
      <section className="panel overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{domain.label}</h2>
            <p className="mt-1 text-xs text-muted">{homeTopics.length} topics · {summary?.findings ?? 0} claims</p>
            {summary&&<p className="mt-3 text-sm"><strong>{formatMetric(summary.claimScore.value)} claim points</strong> · {formatMetric(normalizedMetric(summary,"claim_points",references?.domains[domainId]),"/100")}/100 standardized regional score <span className="text-muted">· {deviationBand(metricComplete(summary,"claim_points")?summary.claimScore.value:null,references?.domains[domainId]).label}</span></p>}
            {summary && !summary.processingComplete && <p className="mt-2 text-xs text-warn-ink">{processingLabel(summary)} · Counts reflect the findings available so far.</p>}
          </div>
          <details className="relative min-w-44 text-xs">
            <summary className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 font-medium">Switch domain</summary>
            <nav className="mt-2 grid gap-1 rounded-lg border border-border bg-surface p-2 sm:grid-cols-2" aria-label="Switch domain">
              {data.tax.domains.filter((entry) => entry.enabled).map((entry) => (
                <Link key={entry.id} href={`${base}&domain=${entry.id}`} aria-current={entry.id === domain.id ? "page" : undefined} className={`rounded px-2 py-1.5 ${entry.id === domain.id ? "bg-primary-soft font-semibold text-primary-ink" : "hover:bg-surface-2"}`}>{entry.label}</Link>
              ))}
            </nav>
          </details>
        </header>
        <TopicMetricsTable rows={homeTopics} base={base} references={references}/>
        <TopicTableLegend />
        <AssessmentNote dashboard={dashboard} />
      </section>
      {relatedInventory.length > 0 && (
        <details className="panel overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Related topics in other domains · {relatedInventory.length}</summary>
          <p className="px-5 pb-3 text-xs text-muted">These cross-listed topics remain in their home domain for coverage and scoring.</p>
          <TopicMetricsTable rows={linkedTopics} base={base} references={references} homeLabels={Object.fromEntries(data.tax.domains.map((entry) => [entry.id, entry.label]))} />
          {excludedRelated.length > 0 && <ul className="px-5 pb-4 text-xs text-muted">{excludedRelated.map(topic => <li key={topic.id}>{topic.id} {topic.label} · Home domain disabled; excluded from assessment.</li>)}</ul>}
        </details>
      )}
      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-foreground">About this domain</summary>
        <p className="mt-2 max-w-prose leading-relaxed">{domain.definition}</p>
      </details>
    </div>
  );
}

function TopicDetail({ data, dashboard, iso3, topicId, base, outdated, reference }: { data: CountryTopics; dashboard: DocumentationDashboard; iso3: string; topicId: string; base: string; outdated: React.ReactNode; reference?: RegionalReference }) {
  const topic = data.tax.topic(topicId)!;
  const home = data.tax.domain(topic.placements[0].domain)!;
  const items = [...data.topicItems(topic.id)];
  const summary = dashboard.topics.find((row) => row.id === topic.id)!;
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Topic breadcrumb" className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <Link href={`/countries/${iso3}`} className="hover:text-primary-ink">Country overview</Link><span aria-hidden>›</span>
        <Link href={base} className="hover:text-primary-ink">All domains</Link><span aria-hidden>›</span>
        <Link href={`${base}&domain=${home.id}`} className="hover:text-primary-ink">{home.label}</Link><span aria-hidden>›</span><span>{topic.id}</span>
      </nav>
      {outdated}
      <section className="panel overflow-hidden">
        <header className="px-5 py-5">
          <span className="font-mono text-xs text-muted">{topic.id}</span>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{topic.label}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
            <span><strong className="mr-1 text-lg tabular">{summary.findings}</strong> findings</span>
            <span><strong className="mr-1 text-lg tabular">{formatMetric(summary.claimScore.value)}</strong> claim points</span>
            <span><strong className="mr-1 text-lg tabular">{formatMetric(normalizedMetric(summary,"claim_points",reference),"/100")}/100</strong> standardized regional score</span>
            <span className="text-muted">Average action stage <strong className="ml-1 text-lg text-foreground" title={summary.score.reason}>{summary.score.value === null ? documentationEmptyLabel(summary.score) : `${formatMetric(summary.score.value,"/100")}/100`}</strong>{!summary.score.complete && <span className="ml-2">Provisional</span>}</span>
          </div>
        </header>
        <details className="border-t border-border px-5 py-3 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">About this topic</summary>
          <div className="mt-3 flex flex-col gap-3 leading-relaxed text-muted">
            <p>{summary.actions} action claims · {summary.context} context claims</p>
            <p className="max-w-prose">{topic.definition}</p>
            <p className="flex flex-wrap gap-1.5">
              {topic.placements.filter((placement) => data.tax.domain(placement.domain)?.enabled).map((placement) => (
                <Link key={placement.domain} href={`${base}&domain=${placement.domain}`} className="rounded-full bg-surface-2 px-2 py-0.5 hover:underline">{data.tax.domain(placement.domain)?.label} › {data.tax.groupOf(topic.id, placement.domain)?.label}</Link>
              ))}
            </p>
            {topic.routing.length > 0 && <p>Related topics: {topic.routing.map((routing) => `for ${routing.when} see ${routing.use}`).join("; ")}</p>}
            <p>Stages describe what the document reports. They are not evidence that an action has been independently verified.</p>
          </div>
        </details>
        <AssessmentNote dashboard={dashboard} />
      </section>
      <Section title="Findings & evidence">
        {items.length === 0 ? <p className="text-sm text-muted">No extracted findings are tagged with this topic. This does not establish that the policy is absent.</p> : <MergedList items={items} iso3={iso3} preferredTopicId={topic.id} />}
      </Section>
    </div>
  );
}

function MergedList({ items, iso3, preferredTopicId }: { items: MergedItem[]; iso3: string; preferredTopicId?: string }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((m, i) => {
        // Lead with a statement tagged to the selected topic, while retaining every linked member.
        const units = preferredTopicId
          ? [...m.units.filter((unit) => unit.topics.includes(preferredTopicId)), ...m.units.filter((unit) => !unit.topics.includes(preferredTopicId))]
          : m.units;
        const first = units[0];
        if (!first) return null;
        const citations = m.units.flatMap((u) => u.citations);
        const uniqueQuotes = new Set(citations.map((c) => `${c.documentId}|${c.page}|${c.quote}`));
        const supporting = uniqueSupportingFindings(units.flatMap(unit => unit.supportingFindings ?? []));
        const scopedUnits = preferredTopicId ? units.filter(unit=>unit.topics.includes(preferredTopicId)) : units;
        const stage = groupStatementType(scopedUnits);
        const additional = [...new Map(citations.filter(c => !supporting.some(f => f.citations.some(s => s.documentId === c.documentId && s.page === c.page && s.quote === c.quote))).map(c => [`${c.documentId}|${c.page}|${c.quote}`, c])).values()];
        return (
          <li key={i} className="py-1 first:pt-0 last:pb-0">
            <ClaimDetails
              title={first.title}
              summary={first.summary}
              text={first.text}
              sourceCount={m.documents.length}
              citationCount={uniqueQuotes.size}
              relatedCount={supporting.length || m.units.length}
              stage={<><FindingStage kind={stage} /><ClaimPoints score={claimScore(scopedUnits)}/></>}
            >
              {units.slice(1).map((u, j) => <div key={j} className="flex flex-col gap-2">
                {u.title && <h4 className="text-sm font-semibold">{u.title}</h4>}
                <p className="text-sm leading-relaxed">{u.text}</p>
              </div>)}
              {supporting.length > 0 ? <SupportingFindings findings={supporting} iso3={iso3} shownTexts={units.flatMap(u=>[u.text,u.summary??""])} shownTitles={units.map(u=>u.title??"")} /> : units.map((u, j) => (
                <div key={j} className="flex min-w-0 flex-col gap-2">
                  <FindingStage kind={groupStatementType([u])} />
                  <FindingFigures figures={u.figures ?? []} />
                  <CitationEvidence citations={u.citations} iso3={iso3} />
                </div>
              ))}
              {supporting.length > 0 && additional.length > 0 && <div className="flex flex-col gap-2"><p className="text-xs text-muted">Additional stored evidence</p><CitationEvidence citations={additional} iso3={iso3} /></div>}
              {m.topics.length > 1 && (
                <p className="flex flex-wrap gap-1">
                  {m.topics.map((id) => <TopicChip key={id} id={id} iso3={iso3} />)}
                </p>
              )}
            </ClaimDetails>
          </li>
        );
      })}
    </ul>
  );
}

export async function TopicChip({ id, iso3 }: { id: string; iso3: string }) {
  const t = (await loadTaxonomyCached()).topic(id);
  return (
    <Link
      href={`/countries/${iso3}?tab=domains&topic=${id}`}
      title={t ? `${t.label}: ${t.definition}` : id}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs hover:border-primary hover:text-primary-ink"
    >
      <span className="font-mono font-semibold">{id}</span>
      {t && <span className="max-w-40 truncate text-muted">{t.label}</span>}
    </Link>
  );
}
