/** Read-only regional metrics. No model inference, legacy stage maxima or invented action scores. */
import type { DocumentationDashboard } from "./documentation-score";
import type { CountryOverview } from "./overview";
import type { CountryTopics } from "./topics";
import type { MergedItem } from "./topic-merge";
import { assessmentTopics } from "./topic-inventory";
import { unitStatementTypes } from "./statement-types";

export interface RegionalCountry {
  iso3: string;
  name: string;
  dashboard: DocumentationDashboard;
  overview: CountryOverview;
  topics: CountryTopics;
}

export interface ResponseStages {
  commitment: number;
  planned: number;
  underway: number;
  delivered: number;
  /** A response group whose members have different stages, including response mixed with context. */
  mixed: number;
  /** Groups containing no response: concerns, other context or unknown stages. */
  other: number;
  /** All observed groups, including context; not a total of only the response stages. */
  total: number;
}

const RESPONSE_KIND = new Map<string, "commitment" | "planned" | "underway" | "delivered">([
  ["commitment", "commitment"], ["planned_action", "planned"],
  ["implementation_underway", "underway"], ["output_delivered", "delivered"],
]);
const emptyStages = (): ResponseStages => ({ commitment: 0, planned: 0, underway: 0, delivered: 0, mixed: 0, other: 0, total: 0 });

type StageInput = Pick<CountryTopics, "tax" | "topics" | "untagged">;

/** Use the same home-topic inventory and shared group identities as buildDocumentationDashboard. */
function visibleGroups(data: StageInput): MergedItem[] {
  const topics = new Set(assessmentTopics(data.tax).map(topic => topic.id));
  return [...new Set([...data.topics.filter((row) => topics.has(row.topic.id)).flatMap((row) => row.items), ...data.untagged])];
}

/**
 * Report only a group's unanimously stated response stage. The legacy maximum stage is not evidence
 * of group-wide implementation. Shared object identity counts cross-tagged groups once nationally.
 */
export function buildResponseStages(data: StageInput): ResponseStages {
  const result = emptyStages();
  for (const group of visibleGroups(data)) {
    result.total++;
    const kinds = new Set(group.units.flatMap(unitStatementTypes));
    const responses = [...kinds].filter((kind): kind is string => kind !== null && RESPONSE_KIND.has(kind));
    if (responses.length === 0) result.other++;
    else if (kinds.size > 1) result.mixed++;
    else result[RESPONSE_KIND.get(responses[0])!]++;
  }
  return result;
}

export interface RegionalSignal {
  id: string;
  label: string;
  countriesWithResponses: number;
  /** Countries with no action claims, including topics with context or no findings. */
  countriesWithoutAction: number;
  /** Countries with an observed result for this topic/domain, including partial extractions. */
  countriesObserved: number;
  /** Countries meeting the stricter complete-processing conditions for this topic/domain. */
  countriesProcessed: number;
}

/** Observed inventories include partial results; benchmark eligibility is handled separately. */
export function summarizeRegion(rows: RegionalCountry[]) {
  const real = rows.filter((row) => !row.dashboard.demo);
  const analyzed = real.filter((row) => row.topics.ready);
  const sum = (read: (row: RegionalCountry) => number) => real.reduce((total, row) => total + read(row), 0);
  const topicObservations = sum((row) => row.dashboard.country.coveragePercent === null ? 0 : row.dashboard.country.topicCount);
  const topicsWithResponses = sum((row) => row.dashboard.country.topicsWithResponses);
  const stages = real.reduce((result, row) => {
    const country = buildResponseStages(row.topics);
    for (const key of Object.keys(result) as Array<keyof ResponseStages>) result[key] += country[key];
    return result;
  }, emptyStages());
  const signals = (level: "topics" | "domains"): RegionalSignal[] => {
    const result = new Map<string, RegionalSignal>();
    for (const row of real) {
      for (const item of row.dashboard[level]) {
        const signal = result.get(item.id) ?? {
          id: item.id, label: item.label, countriesWithResponses: 0,
          countriesWithoutAction: 0, countriesObserved: 0, countriesProcessed: 0,
        };
        if (item.coveragePercent !== null) {
          signal.countriesObserved++;
          if (item.responses > 0) signal.countriesWithResponses++;
        }
        if (item.responses === 0) signal.countriesWithoutAction++;
        if (item.processingComplete) signal.countriesProcessed++;
        result.set(item.id, signal);
      }
    }
    return [...result.values()];
  };
  const completeCountries = analyzed.filter((row) => row.dashboard.country.processingComplete).length;
  return {
    totalCountries: rows.length,
    countries: real.length,
    demoCountries: rows.length - real.length,
    analyzedCountries: analyzed.length,
    completeCountries,
    partialCountries: analyzed.length - completeCountries,
    unanalysedCountries: real.length - analyzed.length,
    documents: sum((row) => row.overview.documents.length),
    findings: sum((row) => row.dashboard.country.findings),
    responses: sum((row) => row.dashboard.country.responses),
    context: sum((row) => row.dashboard.country.context),
    /** Country-topic observations, not the number of unique regional topic IDs. */
    topicObservations,
    topicsAddressed: sum((row) => row.dashboard.country.topicsAddressed),
    topicsWithResponses,
    topicsWithoutAction: sum((row) => row.dashboard.topics.filter((topic) => topic.responses === 0).length),
    responseCoveragePercent: topicObservations > 0 ? 100 * topicsWithResponses / topicObservations : null,
    stages,
    topicSignals: signals("topics"),
    domainSignals: signals("domains"),
  };
}

export interface CohortProfile {
  /** Preserve multiplicity: one NDC and two NDCs are different supplied document inventories. */
  documentKinds: string[];
  taxonomyVersion: string;
  methodVersion: string;
  /** The fixed metric and topic/domain scope being compared. */
  scope: string;
  /** An explicit edition window, when the product defines one. No window is inferred from upload time. */
  sourceWindow?: string;
}

/** Matching keys are necessary, not proof of equivalent underlying national policy priorities. */
export function buildCohortKey(profile: CohortProfile): string {
  return JSON.stringify([
    profile.taxonomyVersion, profile.methodVersion, profile.scope, profile.sourceWindow ?? null,
    [...profile.documentKinds].sort(),
  ]);
}

export interface CohortObservation {
  iso3: string;
  value: number | null;
  cohortKey: string;
  demo: boolean;
  complete: boolean;
}

/**
 * Descriptive comparison only. Population SD describes the supplied cohort; no population inference,
 * min-max score, rank or benchmark is produced from an individual country or unfinished extraction.
 */
export function compareCohort(rows: CohortObservation[], cohortKey: string) {
  const candidates = rows.filter((row): row is CohortObservation & { value: number } =>
    row.cohortKey === cohortKey && !row.demo && row.complete && row.value !== null && Number.isFinite(row.value),
  );
  // Repeated input rows must not manufacture a second country or silently select a conflicting value.
  const eligible = [...new Set(candidates.map((row) => row.iso3))].flatMap((iso3) => {
    const country = candidates.filter((row) => row.iso3 === iso3);
    return country.every((row) => row.value === country[0].value) ? [country[0]] : [];
  });
  const n = eligible.length;
  const mean = n >= 2 ? eligible.reduce((sum, row) => sum + row.value, 0) / n : null;
  const standardDeviation = mean === null ? null : Math.sqrt(eligible.reduce((sum, row) => sum + (row.value - mean) ** 2, 0) / n);
  return {
    n,
    mean,
    standardDeviation,
    comparisons: eligible.map((row) => ({
      iso3: row.iso3,
      value: row.value,
      delta: mean === null ? null : row.value - mean,
      zScore: mean === null || standardDeviation === null || standardDeviation === 0 ? null : (row.value - mean) / standardDeviation,
    })),
    excluded: rows.length - n,
    reason: n < 2 ? "At least two complete, non-demo countries with the same source profile and method are needed."
      : standardDeviation === 0 ? "All eligible countries have the same value; a standardized difference is not defined." : null,
  };
}
