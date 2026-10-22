import { buildRegionalReferences, deviationBand, metricComplete, metricValue, normalizedMetric, type DashboardMetric, type RegionalReferences } from "./dashboard-metrics";
import { documentationBand, type DocumentationDashboard, type DocumentationSummary } from "./documentation-score";
import { buildResponseStages, type RegionalCountry, type ResponseStages } from "./regional-dashboard";

/** Shared dashboard presentation. All numeric values come from the existing scoring functions. */
export const PREVIEW_METRICS = ["claim_points", "detail", "claims", "actions", "coverage"] as const;
export type PreviewMetric = typeof PREVIEW_METRICS[number];
export const PREVIEW_LABELS: Record<PreviewMetric, string> = {
  claim_points: "Claim points", detail: "Average action stage", claims: "Claims", actions: "Action claims", coverage: "Topics covered",
};
export const PREVIEW_DOMAINS = ["climate", "disaster_risk", "agriculture", "water", "nature_land", "energy"];
export type PreviewTone = "lowest" | "low" | "lower" | "middle" | "higher" | "highest" | "unavailable";
export interface PreviewMeasure {
  original: number | null;
  normalized: number | null;
  reference: number | null;
  originalTone: PreviewTone;
  relativeTone: PreviewTone;
}
export interface PreviewScope {
  id: string;
  label: string;
  claims: number;
  actions: number;
  covered: number;
  totalTopics: number;
  processingComplete: boolean;
  measures: Record<PreviewMetric, PreviewMeasure>;
}
export interface PreviewDomain extends PreviewScope { topics: PreviewScope[] }
export interface PreviewCountry {
  iso3: string;
  name: string;
  reportId?: string;
  reportTitle: string;
  documents: number;
  demo: boolean;
  country: PreviewScope;
  domains: PreviewDomain[];
  stages: ResponseStages;
}
export type PreviewReferences = Record<PreviewMetric, RegionalReferences>;
export function dashboardPresentation(rows: Array<RegionalCountry & { reportId?: string; reportTitle?: string }>): PreviewCountry[] {
  const references = previewReferences(rows.map(row => row.dashboard));
  return rows.map(row => ({
    iso3: row.iso3, name: row.name, reportId: row.reportId, reportTitle: row.reportTitle ?? "Current assessment",
    documents: row.overview.documents.length, demo: row.dashboard.demo,
    country: previewScope(row.dashboard.country, row.iso3, row.name, references, "country", row.dashboard.demo),
    stages: buildResponseStages(row.topics),
    domains: row.dashboard.domains.map(domain => ({
      ...previewScope(domain, domain.id, domain.label, references, "domains", row.dashboard.demo),
      topics: row.dashboard.topics.filter(topic => topic.homeDomainId === domain.id).map(topic => previewScope(topic, topic.id, topic.label, references, "topics", row.dashboard.demo)),
    })),
  }));
}
export function previewReferences(dashboards: DocumentationDashboard[]): PreviewReferences {
  return Object.fromEntries(PREVIEW_METRICS.map(metric => [metric, buildRegionalReferences(dashboards, metric)])) as PreviewReferences;
}

const relativeTones = { "below-2": "lowest", "below-1": "lower", neutral: "middle", "above-1": "higher", "above-2": "highest", unavailable: "unavailable" } as const;
const absoluteTones = { low: "low", "mid-low": "lower", mid: "middle", "mid-high": "higher", high: "highest", unavailable: "unavailable" } as const;

export function previewScope(row: DocumentationSummary, id: string, label: string, references: PreviewReferences, scope: "country" | "domains" | "topics", demo: boolean): PreviewScope {
  const measures = Object.fromEntries(PREVIEW_METRICS.map(metric => {
    const reference = scope === "country" ? references[metric].country : references[metric][scope][id];
    const original = metricValue(row, metric);
    const relativeTone = relativeTones[deviationBand(!demo && metricComplete(row, metric) ? original : null, reference).tone];
    return [metric, {
      original, normalized: metric === "coverage" ? null : normalizedMetric(row, metric, reference, demo),
      reference: reference?.mean ?? null, relativeTone,
      originalTone: metric === "detail" || metric === "coverage" ? absoluteTones[documentationBand(original).tone] : relativeTone,
    } satisfies PreviewMeasure];
  })) as Record<PreviewMetric, PreviewMeasure>;
  return { id, label, claims: row.findings, actions: row.actions, covered: row.topicsAddressed, totalTopics: row.topicCount, processingComplete: row.processingComplete, measures };
}

export function previewMetric(value: unknown): PreviewMetric {
  return PREVIEW_METRICS.includes(value as PreviewMetric) ? value as PreviewMetric : "claim_points";
}
export function previewUnit(metric: DashboardMetric, normalized: boolean) {
  return normalized || metric === "detail" ? "/100" : metric === "claim_points" ? "points" : metric === "coverage" ? "%" : "claims";
}
