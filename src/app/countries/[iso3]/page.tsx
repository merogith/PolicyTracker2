import { FileSpreadsheet, FileStack, FileText, Layers, LayoutDashboard, Network, Plus, Scale, Target } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { CoverageHeatmap } from "@/components/charts/coverage-heatmap";
import { DocumentTimeline } from "@/components/charts/document-timeline";
import { DocumentationOverview } from "@/components/charts/documentation-dashboard";
import { PolicyDashboard } from "@/components/design-preview/policy-design-preview";
import { dashboardPresentation, previewMetric } from "@/lib/dashboard-preview";
import { dashboardSelection } from "@/lib/dashboard-metrics";
import { CLAIM_STAGES, metricQuery, buildRegionalReferences, parseActionStages, type DashboardMetric, type MetricScale, type RegionalReferences } from "@/lib/dashboard-metrics";
import { buildDocumentationDashboard } from "@/lib/documentation-score";
import { ClaimExplorer } from "@/components/claim-explorer";
import { buildSearchableClaims } from "@/lib/claim-explorer";
import { RegionalFigures } from "@/components/regional-figures";
import { RegionalPosition } from "@/components/regional-dashboard";
import type { RegionalCountry } from "@/lib/regional-dashboard";
import { KindChip, KindDot } from "@/components/charts/kind";
import { VerifiedMeter } from "@/components/charts/verified-meter";
import { DomainsView } from "@/components/domains-view";
import { DomainIndex } from "@/components/domain-index";
import { Fact, PageHeader } from "@/components/page-header";
import { ResultCard } from "@/components/result-card";
import { Section } from "@/components/section";
import { StatusBadge } from "@/components/status-badge";
import { Tabs } from "@/components/tabs";
import { UploadForm } from "@/components/upload-form";
import { getCountry } from "@/lib/countries";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { countryOverview } from "@/lib/overview";
import { loadTaxonomyCached, type Taxonomy } from "@/lib/taxonomy";
import { countryTopics, type CountryTopics } from "@/lib/topics";
import { countryCards, documentCards, verifiedRate } from "@/lib/views";
import { plural } from "@/lib/plural";
import { ReportMenu } from "@/components/report-menu";
import { readReport } from "@/lib/report-reader";
import { listReports } from "@/lib/reports";
import { ReportProvider } from "@/components/report-link";
import type { CardData } from "@/lib/views";
import { STATIC_DEMO } from "@/lib/static-demo";

const BUSY = ["uploaded", "extracting", "indexing", "analysing", "deleting"];

export default async function CountryPage({ params, searchParams }: PageProps<"/countries/[iso3]">) {
  const { iso3 } = await params;
  const sp = await searchParams;
  const country = await getCountry(iso3);
  if (!country) notFound();

  const reportId = typeof sp.report === "string" ? sp.report : undefined;
  const report = await readReport(country.id, reportId).catch((error: unknown) => {
    if (error instanceof UserError && error.status === 404) notFound();
    throw error;
  });
  const reports = await listReports(country.id);
  const tax = report?.data.taxonomy ?? await loadTaxonomyCached();
  const overview = report?.data.overview ?? await countryOverview(country.id, tax);
  const documents = await db.document.findMany({
    where: { countryId: country.id, status: { not: "deleting" } },
    orderBy: [{ editionDate: "asc" }, { id: "asc" }],
    include: { _count: { select: { pages: { where: { disposition: "unreadable" } } } } },
  });
  const tab = typeof sp.tab === "string" ? sp.tab : documents.length ? "overview" : "documents";
  const topics = ["overview","domains","summary","targets","figures","position"].includes(tab) ? report?.data.topics ?? await countryTopics(country.id, tax) : null;
  const { metric, scale } = dashboardSelection(sp.metric, sp.scale);
  const modernDashboard = !!topics && overview.documents.length > 0 && metric !== "responses" &&
    (tab === "overview" || (tab === "domains" && !sp.domain && !sp.topic && !sp.view && !sp.filter));
  const stages = parseActionStages(sp.stages);
  let references: RegionalReferences | undefined;
  let claimReferences: RegionalReferences | undefined;
  let regional: Array<RegionalCountry & { reportId?: string; reportTitle?: string }> = [];
  if (["position","overview","domains"].includes(tab) && topics) {
    const countries = await db.country.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });
    regional = await Promise.all(countries.map(async row => {
      const peerReport = row.id === country.id ? report : await readReport(row.id);
      const [peerTopics, peerOverview] = row.id === country.id ? [topics,overview] : peerReport ? [peerReport.data.topics, peerReport.data.overview] : await Promise.all([countryTopics(row.id),countryOverview(row.id)]);
      return { iso3:row.iso3,name:row.name,reportId:peerReport?.id,reportTitle:peerReport?.title,topics:peerTopics,overview:peerOverview,dashboard:buildDocumentationDashboard(peerTopics,peerOverview,stages) };
    }));
    references = buildRegionalReferences(regional.map(row=>row.dashboard), metric);
    claimReferences = metric === "claim_points" ? references : buildRegionalReferences(regional.map(row=>row.dashboard), "claim_points");
  }
  const selectedDoc = report ? report.data.overview.documents.map(d => ({ ...d, error: null })).find(d => d.id === tab) ?? null : documents.find((d) => d.id === tab) ?? null;
  const busy = await db.job.count({ where: { countryId: country.id, status: { in: ["queued", "running"] } } }) > 0 || documents.some((d) => BUSY.includes(d.status));
  const base = `/countries/${country.iso3}`;
  const metricParams = metricQuery(metric, scale, stages);

  return (
    <ReportProvider iso3={country.iso3} id={tab === "documents" ? undefined : report?.id}><div>
      <PageHeader
        crumbs={[{ label: "Countries", href: "/countries" }, { label: country.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {country.name}
            <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-sm font-medium text-primary-ink">{country.iso3}</span>
          </span>
        }
        meta={
          <>
            {topics?.hasDemoResults && <Fact tone="warn">Demo results</Fact>}
            {report && <Fact>{report.id === country.mainReportId ? "Main report" : report.title}</Fact>}
            <Fact icon={FileStack}>{documents.length} document{documents.length === 1 ? "" : "s"}</Fact>
            {documents.some(d=>d.status==="failed") && <Link href={`${base}?tab=documents`} className="text-sm text-bad-ink hover:underline">Document processing failed</Link>}
            {!busy && overview.summariesDone < overview.summariesTotal && <span className="text-sm text-muted">Analysis incomplete</span>}
            <AutoRefresh active={busy} />
          </>
        }
        actions={
          <>
            <ReportMenu iso3={country.iso3} reports={reports} mainReportId={country.mainReportId} viewedReportId={report?.id} exportHref={`/api/countries/${country.iso3}/export.json${report ? `?report=${report.id}` : ""}`} />

            {!STATIC_DEMO && <Link href={`${base}?tab=documents#upload`} className="btn btn-primary">
              <Plus className="size-3.5" aria-hidden /> Add document
            </Link>}
          </>
        }
      />

      {!modernDashboard && <Tabs
        label="Country sections"
        active={selectedDoc ? selectedDoc.id : tab}
        items={[
          { id: "overview", href: `${base}?tab=overview&${metricParams}`, label: <><LayoutDashboard className="size-4" aria-hidden /> Overview</> },
          {
            id: "summary",
            href: `${base}?tab=summary`,
            label: <><Layers className="size-4" aria-hidden /> Claims</>,
          },
          { id: "domains", href: `${base}?tab=domains&${metricParams}`, label: <><Network className="size-4" aria-hidden /> Domains & topics</> },
          { id: "targets", href: `${base}?tab=targets`, label: <><Target className="size-4" aria-hidden /> Targets</> },
          { id: "figures", href: `${base}?tab=figures`, label: <><FileSpreadsheet className="size-4" aria-hidden /> Reported figures</> },
          { id: "position", href: `${base}?tab=position&${metricParams}`, label: <><Scale className="size-4" aria-hidden /> Regional position</> },
          ...documents.filter((d) => selectedDoc?.id === d.id).map((d) => ({
            id: d.id,
            href: `${base}?tab=${d.id}`,
            label: (
              <>
                <KindDot kind={d.kind} /> <span className="font-mono text-[13px]">{d.id}</span>
              </>
            ),
            hint: BUSY.includes(d.status) ? <span className="pulse size-1.5 rounded-full bg-primary" title={d.status} /> : d.status === "failed" ? <span className="size-1.5 rounded-full bg-bad" title="failed" /> : undefined,
          })),
          {
            id: "documents",
            href: `${base}?tab=documents`,
            label: <><FileText className="size-4" aria-hidden /> Documents</>,
            hint: <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted tabular">{documents.length}</span>,
          },
        ].map(item => ({ ...item, href: reportId ? `${item.href}&report=${encodeURIComponent(reportId)}` : item.href }))}
      />}

      {modernDashboard && <PolicyDashboard key={`${country.iso3}:${report?.id ?? "live"}:${JSON.stringify(sp)}`} embedded countries={dashboardPresentation(regional)} actionStages={stages} initial={{
        country: country.iso3, metric: previewMetric(metric), normalized: scale === "normalized",
        domain: typeof sp.domain === "string" ? sp.domain : "", comparison: typeof sp.compare === "string" ? sp.compare : "",
        region: false, all: sp.all === "1", tab: tab === "domains" ? "domains" : "overview", chart: sp.chart === "bars" ? "bars" : "radar",
      }} />}
      {tab === "overview" && !modernDashboard && <OverviewTab overview={overview} topics={topics!} iso3={country.iso3} metric={metric} scale={scale} stages={stages} references={references} />}
      {tab === "domains" && !modernDashboard && (
        <div className="flex flex-col gap-4">
        <details className="text-xs text-muted"><summary className="w-fit cursor-pointer">Action definition</summary><p className="mt-2">Action counts include: {stages.length ? CLAIM_STAGES.filter(stage=>stages.includes(stage.value)).map(stage=>stage.label).join(", ") : "no stages selected"}. <Link href={`${base}?tab=overview&${metricQuery("actions", "raw", stages)}`} className="text-primary-ink hover:underline">Edit action definition</Link></p></details>
        <DomainsView
          data={topics!}
          dashboard={buildDocumentationDashboard(topics!, overview, stages)}
          stages={stages}
          metric={metric} scale={scale} references={references} claimReferences={claimReferences}
          iso3={country.iso3}
          domainId={typeof sp.domain === "string" ? sp.domain : undefined}
          topicId={typeof sp.topic === "string" ? sp.topic : undefined}
          view={typeof sp.view === "string" ? sp.view : undefined}
          filter={typeof sp.filter === "string" ? sp.filter : undefined}
        />
        </div>
      )}
      {tab === "summary" && <SummaryTab reportId={report?.id} topics={topics!} name={country.name} countryId={country.id} iso3={country.iso3} tax={overview.tax} hasDocuments={overview.documents.length > 0} />}
      {tab === "targets" && <ClaimExplorer rows={buildSearchableClaims(country, topics!)} domainCatalogue={tax.domains} countryOnly targetsOnly />}
      {tab === "figures" && <RegionalFigures rows={[{iso3:country.iso3,country:country.name,demo:topics!.hasDemoResults,figures:overview.figures}]} domains={overview.domains.map(({id,label})=>({id,label}))} countryOnly />}
      {tab === "position" && <RegionalPosition rows={regional} countryIso3={country.iso3} metric={metric} stages={stages} area={typeof sp.area === "string" ? sp.area : undefined} profile={typeof sp.profile === "string" ? sp.profile : undefined} />}
      {selectedDoc && <DocumentTab savedCards={report?.data.documentCards[selectedDoc.id]} doc={selectedDoc} iso3={country.iso3} tax={overview.tax} />}
      {tab === "documents" && (
        <div className="flex flex-col gap-6">
          {!STATIC_DEMO && <Section id="upload" title="Add documents">
            <UploadForm iso3={country.iso3} />
          </Section>}
          <Section title="Documents">
            {documents.length === 0 ? (
              <p className="text-sm text-muted">No documents yet.{!STATIC_DEMO && " Add the country’s NDC, adaptation plan or disaster-risk strategy above."}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link href={`${base}?tab=${d.id}`} className="flex items-center gap-2 font-medium hover:underline">
                        <span className="truncate">{d.title}</span>
                      </Link>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="font-mono">{d.id}</span>
                        <KindChip kind={d.kind} />
                        <span className="tabular">edition {d.editionDate}</span>
                        <span className="tabular">{d.pageCount ?? "?"} pages</span>
                        {d._count.pages > 0 && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-warn-ink">{d._count.pages} unreadable</span>}
                      </p>
                      {d.error && <p className="text-xs text-bad-ink">{d.error}</p>}
                    </div>
                    <StatusBadge status={d.status} />
                    <div className="flex gap-2">
                      <Link href={`${base}/documents/${d.id}`} className="btn btn-sm">
                        Read document
                      </Link>
                      <ActionButton url="/api/results/rerun" body={{ documentId: d.id }} label="Re-run" icon="rerun" size="sm" confirm={`Ask every domain again of ${d.id}?`} />
                      <ActionButton
                        url={`/api/documents/${d.id}`}
                        method="DELETE"
                        label="Delete"
                        icon="delete"
                        variant="danger"
                        size="sm"
                        confirm={`Delete ${d.id} and its answers? The combined summaries will be re-run without it.`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <ProcessingDetails overview={overview} iso3={country.iso3} />
          {!STATIC_DEMO && <details className="text-sm"><summary className="w-fit cursor-pointer text-muted">Country settings</summary><div className="mt-3"><Section title="Delete this country" description="Removes every document, answer and summary of this country, and its files at OpenAI. This cannot be undone.">
            <div>
              <ActionButton
                url={`/api/countries/${country.iso3}`}
                method="DELETE"
                label={`Delete ${country.name}`}
                icon="delete"
                variant="danger"
                confirm={`Delete ${country.name}, all its documents and results, and its files at OpenAI?`}
                redirectTo="/countries"
              />
            </div>
          </Section></div></details>}
        </div>
      )}
    </div></ReportProvider>
  );
}

function OverviewTab({ overview, topics, iso3, metric, scale, stages, references }: { overview: Awaited<ReturnType<typeof countryOverview>>; topics: CountryTopics; iso3: string; metric: DashboardMetric; scale: MetricScale; stages: number[]; references?: RegionalReferences }) {
  if (overview.documents.length === 0) return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <h2 className="text-base font-semibold">Start with a policy document</h2>
      <p className="max-w-prose text-sm text-muted">Add an NDC, adaptation plan or disaster-risk strategy to explore its topics, claims and source evidence.</p>
      <Link href={`/countries/${iso3}?tab=documents#upload`} className="btn btn-primary"><Plus className="size-3.5" aria-hidden /> Add a document</Link>
    </div>
  );
  const dashboard = buildDocumentationDashboard(topics, overview, stages);
  const prefixes = Object.fromEntries(topics.tax.domains.map(d => [d.id, d.prefix]));
  return (
    <div className="flex flex-col gap-6">
      <DocumentationOverview dashboard={dashboard} prefixes={prefixes} iso3={iso3} metric={metric} scale={scale} stages={stages} references={references} />

    </div>
  );
}

function ProcessingDetails({overview,iso3}:{overview:Awaited<ReturnType<typeof countryOverview>>;iso3:string}) {
  return (
      <details className="panel p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold">Documents & processing <span className="ml-2 text-xs font-normal text-muted">{plural(overview.documents.length, "document")} · {overview.pages.read} readable pages</span></summary>
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span>{overview.summariesDone}/{overview.summariesTotal} summaries complete</span>
            <span>${overview.spentUsd.toFixed(2)} estimated for saved results</span>
            <Link href={`/runs?country=${iso3}`} className="text-primary-ink hover:underline">Run history</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-2 p-4"><p className="text-xs text-muted">Document text</p><p className="mt-2 text-2xl font-semibold tabular">{overview.pages.read}<span className="text-sm font-normal text-muted"> readable pages</span></p><p className="mt-2 text-xs text-muted">{overview.pages.unreadable ? `${plural(overview.pages.unreadable, "page")} unreadable; OCR is not enabled.` : "All pages have readable text."}</p></div>
            <div className="rounded-xl bg-surface-2 p-4"><VerifiedMeter verified={overview.verified.verified} total={overview.verified.total} /></div>
          </div>
          <Section title="Documents over time"><DocumentTimeline documents={overview.documents} iso3={iso3} /></Section>
          <Section title="Findings by source"><CoverageHeatmap overview={overview} iso3={iso3} /></Section>
        </div>
      </details>
  );
}

async function SummaryTab({ countryId, iso3, tax, hasDocuments, topics, name, reportId }: { countryId: string; iso3: string; tax: Taxonomy; hasDocuments: boolean; topics: CountryTopics; name: string; reportId?: string }) {
  if (!hasDocuments) return <p className="text-sm text-muted">Add a document to see claims.</p>;
  const cards = await countryCards(countryId, tax.domains, tax.version, reportId);
  return (
    <div className="flex flex-col gap-2">

      <ClaimExplorer rows={buildSearchableClaims({iso3,name},topics)} domainCatalogue={topics.tax.domains} countryOnly />
      <details className="mt-4"><summary className="w-fit cursor-pointer text-sm font-medium text-muted">Analysis options</summary>
      <div className="mt-3"><ActionButton url="/api/results/rerun" body={{ countryId }} label="Re-run summaries" icon="rerun" confirm="Run every combined summary again?" /></div>
      <div className="claims-layout mt-4">
      <DomainIndex cards={cards} prefix="summary" />
      <div className="min-w-0 space-y-5">
        {cards.map((card) => (
          <ResultCard key={card.domain.id} anchor={`summary-${card.domain.id}`} card={card} iso3={iso3} rerun={{ countryId }} />
        ))}
      </div></div>
      </details>
    </div>
  );
}

async function DocumentTab({
  doc,
  iso3,
  tax,
  savedCards,
}: {
  doc: { id: string; title: string; kind: string; editionDate: string; pageCount: number | null; status: string; error: string | null };
  iso3: string;
  tax: Taxonomy;
  savedCards?: CardData[];
}) {
  const cards = savedCards ?? await documentCards(doc.id, tax.domains, tax.version);
  const rate = verifiedRate(cards);
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold">{doc.title}</h2>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <KindChip kind={doc.kind} />
            <span className="tabular">edition {doc.editionDate}</span>
            <span className="tabular">{doc.pageCount ?? "?"} pages</span>
            <StatusBadge status={doc.status} />
            {rate.total > 0 && (
              <span className="tabular">
                {rate.verified}/{rate.total} quotes matched
              </span>
            )}
          </p>
          {doc.error && <p className="text-xs text-bad-ink">{doc.error}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/countries/${iso3}/documents/${doc.id}`} className="btn">
            <FileText className="size-3.5" aria-hidden /> Read document
          </Link>
          <ActionButton url="/api/results/rerun" body={{ documentId: doc.id }} label="Re-run all domains" icon="rerun" confirm={`Ask every domain again of ${doc.id}?`} />
        </div>
      </div>
      <div className="claims-layout">
      <DomainIndex cards={cards} prefix="domain" />
      <div className="min-w-0 space-y-5">
        {cards.map((card) => (
          <ResultCard key={card.domain.id} anchor={`domain-${card.domain.id}`} card={card} iso3={iso3} rerun={{ documentId: doc.id }} />
        ))}
      </div></div>
    </div>
  );
}
