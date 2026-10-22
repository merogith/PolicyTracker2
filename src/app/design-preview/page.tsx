import { PolicyDashboard } from "@/components/design-preview/policy-design-preview";
import { db } from "@/lib/db";
import { loadTaxonomyCached } from "@/lib/taxonomy";
import { countryTopics } from "@/lib/topics";
import { countryOverview } from "@/lib/overview";
import { readReport } from "@/lib/report-reader";
import { buildDocumentationDashboard } from "@/lib/documentation-score";
import { dashboardSelection, parseActionStages } from "@/lib/dashboard-metrics";
import { previewMetric, dashboardPresentation } from "@/lib/dashboard-preview";

export const metadata = { title: "Dashboard design preview · Policy Tracker" };

export default async function DesignPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { metric, scale } = dashboardSelection(params.metric, params.scale);
  const stages = parseActionStages(params.stages);
  const countries = await db.country.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, iso3: true, name: true } });
  const currentTaxonomy = await loadTaxonomyCached();
  const rows = await Promise.all(countries.map(async country => {
    const reportId = params.country === country.iso3 && typeof params.report === "string" ? params.report : undefined;
    const report = await readReport(country.id, reportId);
    const tax = report?.data.taxonomy ?? currentTaxonomy;
    const [topics, overview] = report ? [report.data.topics, report.data.overview] : await Promise.all([countryTopics(country.id, tax), countryOverview(country.id, tax)]);
    return { ...country, reportId: report?.id, reportTitle: report?.title, topics, overview, dashboard: buildDocumentationDashboard(topics, overview, stages) };
  }));
  const data = dashboardPresentation(rows);
  if (!data.length) return <p>Add a country and its documents to try the dashboard preview.</p>;
  const requested = typeof params.country === "string" ? params.country : "KAZ";
  const country = data.find(row => row.iso3 === requested) ?? data.find(row => row.country.claims > 0) ?? data[0];
  return <PolicyDashboard countries={data} actionStages={stages} initial={{
    country: country.iso3, metric: previewMetric(metric), normalized: scale === "normalized",
    domain: typeof params.domain === "string" ? params.domain : "", comparison: typeof params.compare === "string" ? params.compare : "",
    region: params.view === "region", all: params.all === "1",
    tab: params.tab === "domains" ? "domains" : "overview", chart: params.chart === "bars" ? "bars" : "radar",
  }} />;
}
