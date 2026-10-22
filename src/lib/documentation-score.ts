// Current dashboard adapter: observed counts plus the average action-stage index.
// The legacy four-check proposal stays separately unavailable; never conflate the two methods.
import type { CountryOverview } from "./overview";
import type { CountryTopics } from "./topics";
import type { MergedItem } from "./topic-merge";
import { aggregateDocumentation, DOCUMENTATION_RUBRIC, topicDocumentationAssessment } from "./documentation-stage";
import { countActions, DEFAULT_ACTION_STAGES } from "./dashboard-metrics";
import { assessmentTopics, homeDomainId, homeTopics } from "./topic-inventory";
import { sumClaimScores } from "./claim-score";
import { statementTypePoints, unitStatementTypes } from "./statement-types";

export type DocumentationTone = "low" | "mid-low" | "mid" | "mid-high" | "high" | "unavailable";

export interface DocumentationBand {
  label: string;
  tone: DocumentationTone;
}

export const SCORE_BANDS = [
  { minimum: 0, label: "0–<25", tone: "low" },
  { minimum: 25, label: "25–<50", tone: "mid-low" },
  { minimum: 50, label: "50–<75", tone: "mid" },
  { minimum: 75, label: "75–<100", tone: "mid-high" },
  { minimum: 100, label: "100", tone: "high" },
] as const;

/** Absolute bands follow the action-stage anchors; regional deviation bands keep their thresholds. */
export function documentationBand(score: number | null): DocumentationBand {
  if (score === null || !Number.isFinite(score) || score < 0 || score > 100) {
    return { label: "Assessment unavailable", tone: "unavailable" };
  }
  const band = SCORE_BANDS.findLast(band => score >= band.minimum)!;
  return { label: band.label, tone: band.tone };
}

export interface DocumentationSummary {
  /** Average action stage on a 0–100 scale; non-action topics have no numerical score. */
  score: ReturnType<typeof aggregateDocumentation>;
  claimScore: ReturnType<typeof sumClaimScores>;
  /** Source findings grouped by exact assertion, figures and statement type; semantic duplicates may remain. */
  findings: number;
  responses: number;
  /** Groups with a member at one of the user's selected claim stages, counted once in this scope. */
  actions: number;
  context: number;
  topicsAddressed: number;
  topicsWithResponses: number;
  topicCount: number;
  /** Observed topic presence, not a policy-detail or implementation score. */
  coveragePercent: number | null;
  responseCoveragePercent: number | null;
  /** Home-domain extraction finished for all supplied documents. This is not a recall guarantee. */
  processedTopics: number;
  processingComplete: boolean;
  processingState: "complete" | "partial" | "pending" | "failed" | "unavailable";
  /** Differently worded restatements cannot be resolved by exact matching alone. */
  countsProvisional: true;
  detail: {
    score: null;
    label: "Assessment unavailable";
    tone: "gray";
    reason: string;
  };
  change: { symbol: "—"; label: string };
}

export function processingLabel(row: Pick<DocumentationSummary, "processingState">): string {
  return {
    complete: "Complete",
    partial: "Provisional",
    pending: "Analysis pending",
    failed: "Analysis failed",
    unavailable: "Not assessed",
  }[row.processingState];
}

export interface DocumentationDomain extends DocumentationSummary {
  id: string;
  label: string;
}

export interface DocumentationTopic extends DocumentationSummary {
  id: string;
  label: string;
  homeDomainId: string | null;
}

export interface DocumentationDashboard {
  /** At least one current summary uses invented demonstration results. */
  demo: boolean;
  country: DocumentationSummary;
  domains: DocumentationDomain[];
  topics: DocumentationTopic[];
  methodNote: string;
  countNote: string;
}

type Input = Pick<CountryTopics, "tax" | "topics" | "untagged" | "ready" | "outdated" | "retagPending"> & { hasDemoResults?: boolean; savedDashboards?: Record<string, DocumentationDashboard> };
type Processing = Pick<CountryOverview, "coverage" | "documents" | "pages">;

const DETAIL_REASON = "These results do not yet record the source-linked responsibility, action timeframe and specific output checks required for a policy-detail score.";
const CHANGE_REASON = "No comparable complete assessments. Upload order and reported stages do not establish documentation change.";
/** A shared quote can group a response in one topic with context in another. Keep attribution local. */
const response = (item: MergedItem, topicIds?: Set<string>) => item.units.some((unit) =>
  unitStatementTypes(unit).some(type => (statementTypePoints(type) ?? 0) > 0) &&
  (topicIds === undefined || unit.topics.some((id) => topicIds.has(id))),
);

/**
 * Call with the direct countryTopics() result, before serializing it: its topic lists share the
 * same MergedItem objects. Object identity therefore counts a cross-tagged group once nationally.
 * Domains use home topics for a consistent coverage denominator; their finding counts can overlap
 * when a group is tagged to topics in more than one domain. Never sum those domain counts.
 */
export function buildDocumentationDashboard(data: Input, overview?: Processing, actionStages: readonly number[] = DEFAULT_ACTION_STAGES): DocumentationDashboard {
  const saved = data.savedDashboards?.[[...new Set(actionStages)].sort((a, b) => a - b).join(",")];
  if (saved?.country.score.version === DOCUMENTATION_RUBRIC.version) return saved;
  const enabledDomains = data.tax.domains.filter((domain) => domain.enabled);
  const allTopics = assessmentTopics(data.tax);
  const homeByTopic = new Map(allTopics.map(topic => [topic.id, homeDomainId(topic)]));
  const itemsByTopic = new Map(data.topics.map((row) => [row.topic.id, row.items]));
  const hasCurrentTags = data.outdated === 0 && data.retagPending === 0;
  const scoreAvailable = !data.hasDemoResults && data.ready && hasCurrentTags;
  const scoreTopics = (topicIds: string[], complete: boolean, processed: (id: string) => boolean) => {
    const assessments = topicIds.map(id => topicDocumentationAssessment(itemsByTopic.get(id) ?? [], id, processed(id)));
    return aggregateDocumentation(
      assessments.map(assessment => scoreAvailable ? assessment.level : null),
      scoreAvailable && complete && assessments.every(assessment => assessment.complete),
    );
  };
  if (saved) {
    // Recalculate only this derived metric from the report's own frozen evidence.
    // Claim totals, selected-stage counts, the saved export and the stored snapshot remain intact.
    const processed = (id: string) => saved.topics.find(topic => topic.id === id)?.processingComplete === true;
    return {
      ...saved,
      country: { ...saved.country, score: scoreTopics(allTopics.map(topic => topic.id), saved.country.processingComplete, processed) },
      domains: saved.domains.map(row => ({ ...row, score: scoreTopics(homeTopics(allTopics, row.id).map(topic => topic.id), row.processingComplete, processed) })),
      topics: saved.topics.map(row => ({ ...row, score: scoreTopics([row.id], row.processingComplete, processed) })),
    };
  }
  const evidenceReady = Boolean(
    data.ready && !data.hasDemoResults && overview && overview.documents.length > 0 && !overview.documents.some(d => d.status === "partial") &&
    overview.pages.unreadable === 0 && hasCurrentTags,
  );
  const processedDomains = new Set(
    overview?.coverage.filter((row) =>
      row.cells.length === overview.documents.length && row.cells.length > 0 &&
      row.cells.every((cell) => cell.status === "found" || cell.status === "not_found"),
    ).map((row) => row.domain.id) ?? [],
  );
  const completedDomains = new Set(overview?.coverage.filter(row =>
    processedDomains.has(row.domain.id) && row.summaryStatus === "done",
  ).map(row => row.domain.id) ?? []);
  const unique = (items: MergedItem[]) => [...new Set(items)];

  const summarize = (topicIds: string[], extraItems: MergedItem[] = [], national = false): DocumentationSummary => {
    const items = unique([...topicIds.flatMap((id) => itemsByTopic.get(id) ?? []), ...extraItems]);
    const topicsAddressed = topicIds.filter((id) => (itemsByTopic.get(id)?.length ?? 0) > 0).length;
    const responseTopics = topicIds.filter((id) => itemsByTopic.get(id)?.some((item) => response(item, new Set([id]))));
    const scopedTopics = new Set(topicIds);
    const responses = items.filter((item) => response(item, national ? undefined : scopedTopics)).length;
    const processedTopics = hasCurrentTags ? topicIds.filter((id) => {
      const home = homeByTopic.get(id);
      return home !== undefined && processedDomains.has(home);
    }).length : 0;
    const homeDomains = new Set(topicIds.map(id => homeByTopic.get(id)));
    const processingComplete = evidenceReady && topicIds.length > 0 && [...homeDomains].every(id => id !== undefined && completedDomains.has(id));
    const domainProcessing = overview?.coverage.filter(row => homeDomains.has(row.domain.id)) ?? [];
    const cells = domainProcessing.flatMap(row => row.cells);
    const processingState: DocumentationSummary["processingState"] = processingComplete ? "complete"
      : cells.some(cell => cell.status === "failed") || domainProcessing.some(row => row.summaryStatus === "failed") ? "failed"
      : cells.some(cell => cell.status === "pending") || domainProcessing.some(row => row.summaryStatus === "pending") ? "pending"
      : items.length > 0 || cells.some(cell => cell.status === "found" || cell.status === "not_found") ? "partial"
      : "unavailable";
    // Observations remain visible during processing. An empty unfinished scope cannot establish zero.
    const coverageAvailable = topicIds.length > 0 && data.ready && (items.length > 0 || processingComplete);
    return {
      score: scoreTopics(topicIds, processingComplete, id => evidenceReady && completedDomains.has(homeByTopic.get(id) ?? "")),
      claimScore: sumClaimScores(items, processingComplete, !data.hasDemoResults && data.ready && hasCurrentTags, national ? undefined : scopedTopics),
      findings: items.length,
      responses,
      actions: countActions(items, actionStages, national ? undefined : scopedTopics),
      context: items.length - responses,
      topicsAddressed,
      topicsWithResponses: responseTopics.length,
      topicCount: topicIds.length,
      coveragePercent: coverageAvailable ? (100 * topicsAddressed) / topicIds.length : null,
      responseCoveragePercent: coverageAvailable
        ? (100 * responseTopics.length) / topicIds.length
        : null,
      processedTopics,
      processingComplete,
      processingState,
      countsProvisional: true,
      detail: { score: null, label: "Assessment unavailable", tone: "gray", reason: DETAIL_REASON },
      change: { symbol: "—", label: CHANGE_REASON },
    };
  };

  return {
    demo: data.hasDemoResults === true,
    country: summarize(allTopics.map((topic) => topic.id), data.untagged, true),
    domains: enabledDomains.map((domain) => ({
      id: domain.id,
      label: domain.label,
      ...summarize(homeTopics(allTopics, domain.id).map(topic => topic.id)),
    })),
    topics: allTopics.map((topic) => ({
      id: topic.id,
      label: topic.label,
      homeDomainId: homeDomainId(topic) ?? null,
      ...summarize([topic.id]),
    })),
    methodNote: "Topic coverage uses home topics in enabled domains and shows topics addressed in extracted findings, not policy quality or implementation. Processing can miss relevant information.",
    countNote: "Counts use individual source findings. Exact restatements with the same figures and statement type count once across documents. Different wording or progression states remain separate. A claim counts once nationally and may appear in several topics or domains. Do not add those rows together.",
  };
}
