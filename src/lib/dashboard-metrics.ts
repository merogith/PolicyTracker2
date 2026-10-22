import type { DocumentationDashboard, DocumentationSummary } from "./documentation-score";
import type { MergedItem } from "./topic-merge";
import { statementTypePoints, unitStatementTypes } from "./statement-types";

export type DashboardMetric = "responses" | "claims" | "actions" | "coverage" | "detail" | "claim_points";
export type MetricScale = "raw" | "normalized";
export const REGIONAL_NORMALIZATION_VERSION = "regional-normal-cdf-v1";
export const REGIONAL_NORMALIZATION_DESCRIPTION = "Standardized regional score = 100 * Phi((raw - regional mean) / population SD), where Phi is the standard normal cumulative distribution function. The regional mean maps to 50; -1/+1 SD to 15.9/84.1; -2/+2 SD to 2.3/97.7. At least two complete non-demo countries are required in the same country/domain/topic scope. Equal totals (zero SD), including all-zero totals, receive 50 by convention. Partial results are excluded. The reference uses the full eligible region, independent of display filters. This is a standardized score, not an observed percentile or percentage implementation. Colors use the same raw population SD.";
export const DASHBOARD_METRICS = ["claim_points", "detail", "claims", "actions", "coverage"] as const;
export const CLAIM_STAGES = [
  { value: 0, kind: "concern", label: "Non-action statements" },
  { value: 1, kind: "commitment", label: "Commitment" },
  { value: 2, kind: "planned_action", label: "Planned action" },
  { value: 3, kind: "underway", label: "Underway" },
  { value: 4, kind: "delivered", label: "Delivered" },
] as const;
export const DEFAULT_ACTION_STAGES = [1, 2, 3, 4];

export function parseActionStages(value: unknown): number[] {
  if (typeof value !== "string" && !Array.isArray(value)) return [...DEFAULT_ACTION_STAGES];
  const tokens = (Array.isArray(value) ? value : [value]).flatMap(v => typeof v === "string" ? v.split(",") : []);
  const stages = CLAIM_STAGES.filter(stage => tokens.includes(String(stage.value))).map(stage => stage.value);
  return stages.length || tokens.every(token => token === "") ? stages : [...DEFAULT_ACTION_STAGES];
}

/** Count each group once if any member in this scope has a selected claim stage. */
export function countActions(items: MergedItem[], stages: readonly number[], topicIds?: Set<string>): number {
  return [...new Set(items)].filter(item => item.units.some(unit =>
    unitStatementTypes(unit).some(type => { const points = statementTypePoints(type); return points !== null && stages.includes(points); }) &&
    (topicIds === undefined || unit.topics.some(id => topicIds.has(id))),
  )).length;
}

export function parseDashboardMetric(value: unknown): DashboardMetric {
  if (value === "detail" || value === "score") return "detail";
  return value === "claims" || value === "actions" || value === "coverage" || value === "responses" ? value : "claim_points";
}
export function metricLabel(metric: DashboardMetric) {
  return { responses: "Action coverage", claims: "Claims", actions: "Action claims", coverage: "Topics covered", detail: "Average action stage", claim_points: "Claim points" }[metric];
}
export function metricValue(row: DocumentationSummary, metric: DashboardMetric): number | null {
  if (metric === "claim_points") return row.claimScore.value;
  if (metric === "claims" || metric === "actions") return row.coveragePercent === null ? null : metric === "claims" ? row.findings : row.actions;
  return metric === "coverage" ? row.coveragePercent : metric === "responses" ? row.responseCoveragePercent : row.score.value;
}
export function supportsNormalization(metric: DashboardMetric) {
  return metric === "detail" || isCountMetric(metric);
}
export function isCountMetric(metric: DashboardMetric) {
  return metric === "claims" || metric === "actions" || metric === "claim_points";
}
export function metricComplete(row: DocumentationSummary, metric: DashboardMetric) {
  return row.processingComplete && (metric === "detail" ? row.score.complete : metric === "claim_points" ? row.claimScore.complete : true);
}
export function parseMetricScale(value: unknown, metric: DashboardMetric): MetricScale {
  return value === "normalized" && supportsNormalization(metric) ? "normalized" : "raw";
}
/** Fresh dashboards lead with normalized claim points; explicit saved selections keep their scale. */
export function dashboardSelection(metricInput: unknown, scaleInput: unknown) {
  const metric = parseDashboardMetric(metricInput);
  const scale = parseMetricScale(scaleInput ?? (metricInput === undefined ? "normalized" : "raw"), metric);
  return { metric, scale };
}
export function metricUnit(metric: DashboardMetric, scale: MetricScale = "raw") {
  return scale === "normalized" || metric === "detail" ? "/100" : metric === "claim_points" ? " pts" : isCountMetric(metric) ? "" : "%";
}
export function metricQuery(metric: DashboardMetric, scale: MetricScale, stages: readonly number[]) {
  return new URLSearchParams({ metric, scale, stages: stages.join(",") }).toString();
}
/** Round scores and percentages for display only; calculations retain their full precision. */
export const formatMetric = (value: number | null, unit = "") =>
  value === null || !Number.isFinite(value) ? "—" : unit === "/100" || unit === "%" ? Math.round(value).toString() : Number(value.toFixed(1)).toString();

export interface RegionalReference { maximum: number | null; mean: number | null; standardDeviation: number | null; values: number[]; countries: number; total: number }
export interface RegionalReferences { country: RegionalReference; domains: Record<string, RegionalReference>; topics: Record<string, RegionalReference> }

/** Population mean/SD of the eligible region, independent of the current display filter. */
export function regionalReference(values: number[], total: number): RegionalReference {
  const mean = values.length >= 2 ? values.reduce((a,b) => a+b,0) / values.length : null;
  const standardDeviation = mean === null ? null : Math.sqrt(values.reduce((sum,value) => sum + (value-mean)**2,0) / values.length);
  return { mean, standardDeviation, maximum: mean === null ? null : Math.max(...values), values, countries: values.length, total };
}

export function buildRegionalReferences(dashboards: DocumentationDashboard[], metric: DashboardMetric): RegionalReferences {
  const real = dashboards.filter(dashboard => !dashboard.demo);
  const reference = (rows: Array<DocumentationSummary | undefined>): RegionalReference => {
    const values = rows.flatMap(row => {
      if (!row || !metricComplete(row, metric)) return [];
      const value = metricValue(row, metric);
      return value !== null && Number.isFinite(value) && value >= 0 ? [value] : [];
    });
    return regionalReference(values, real.length);
  };
  return {
    country: reference(real.map(d => d.country)),
    domains: Object.fromEntries([...new Set(real.flatMap(d => d.domains.map(domain => domain.id)))].map(id =>
      [id, reference(real.map(d => d.domains.find(domain => domain.id === id)))],
    )),
    topics: Object.fromEntries([...new Set(real.flatMap(d => d.topics.map(topic => topic.id)))].map(id =>
      [id, reference(real.map(d => d.topics.find(topic => topic.id === id)))],
    )),
  };
}

/** Standard normal CDF, Abramowitz–Stegun 26.2.17; absolute error below 7.5e-8. */
export function standardNormalCdf(z: number): number {
  if (z === 0) return 0.5;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const density = Math.exp(-z*z/2) / Math.sqrt(2*Math.PI);
  const tail = density * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.max(0, Math.min(1, z < 0 ? tail : 1-tail));
}

export function normalizedMetric(row: DocumentationSummary, metric: DashboardMetric, reference?: RegionalReference, demo = false): number | null {
  const raw = metricValue(row, metric);
  if (demo || !metricComplete(row, metric) || raw === null || !Number.isFinite(raw) || raw < 0 || !reference || reference.values.length < 2) return null;
  const { mean, standardDeviation } = reference;
  if (mean === null || standardDeviation === null || !Number.isFinite(mean) || !Number.isFinite(standardDeviation) || standardDeviation < 0) return null;
  // Keep the benchmark tied to the eligible cohort, even when display filters change.
  if (!reference.values.includes(raw)) return null;
  // No spread means no relative difference; use the neutral midpoint by convention.
  if (standardDeviation === 0) return 50;
  return 100 * standardNormalCdf((raw-mean)/standardDeviation);
}

export function standardDeviations(value: number, reference: RegionalReference) {
  return reference.mean === null || reference.standardDeviation === null || reference.standardDeviation === 0
    ? null : (value-reference.mean)/reference.standardDeviation;
}

export type DeviationTone = "below-2" | "below-1" | "neutral" | "above-1" | "above-2" | "unavailable";
export const DEVIATION_LEGEND: ReadonlyArray<{ tone: DeviationTone; label: string }> = [
  { tone: "below-2", label: "≤ −2 SD" },
  { tone: "below-1", label: "−2 to < −1 SD" },
  { tone: "neutral", label: "Within ±1 SD" },
  { tone: "above-1", label: "> +1 to < +2 SD" },
  { tone: "above-2", label: "≥ +2 SD" },
  { tone: "unavailable", label: "Comparison unavailable" },
];

export function deviationBand(value: number | null, reference?: RegionalReference): { label: string; tone: DeviationTone; z: number | null } {
  if (value === null || !reference || reference.mean === null) return { label: "Comparison unavailable", tone: "unavailable", z: null };
  if (reference.standardDeviation === 0) return { label: "Equal regional totals", tone: "neutral", z: null };
  const z = standardDeviations(value, reference);
  if (z === null) return { label: "Comparison unavailable", tone: "unavailable", z };
  return z <= -2 ? { label: "Much lower than regional average", tone: "below-2", z }
    : z < -1 ? { label: "Below regional average", tone: "below-1", z }
    : z <= 1 ? { label: "Near regional average", tone: "neutral", z }
    : z < 2 ? { label: "Above regional average", tone: "above-1", z }
    : { label: "Much higher than regional average", tone: "above-2", z };
}
