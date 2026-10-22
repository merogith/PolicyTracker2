// Merging of combined-summary items for topic views: matching assertions and figures
// that share a quote on the same document page merge, transitively; a merged item keeps every topic
// of its members and its stage is the highest stage among its findings. Pure, so it is unit-tested.
import type { FindingFigure, SupportingFinding } from "./claim-presentation";
import type { SourceClassification } from "./labels";
import { normalise } from "./analysis/verify";
import type { TopicStatus } from "./scoring";
import { statementTypePoints, unitStatementTypes } from "./statement-types";

export const STAGE_OF: Record<string, number | null> = {
  concern: 0,
  commitment: 1,
  planned_action: 2,
  underway: 3,
  delivered: 4,
  other: null,
};
export const STAGE_KINDS = ["concern", "commitment", "planned_action", "underway", "delivered"] as const;

export interface UnitCitation {
  id: string;
  documentId: string;
  page: number;
  quote: string;
  verified: boolean;
}

export interface Unit {
  /** Frozen per-claim score, restored only from an immutable report. */
  savedGroupScore?: { members: string; score: { points: number | null; reason: string; sourceMatched: boolean } };
  /** The domain whose question found it. */
  domainId: string;
  domainLabel: string;
  path: string;
  kind: string | null;
  text: string;
  title?: string;
  summary?: string;
  figures?: FindingFigure[];
  supportingFindings?: SupportingFinding[];
  classifications?: SourceClassification[];
  classificationComplete?: boolean;
  sourceFindingsComplete?: boolean;
  topics: string[];
  citations: UnitCitation[];
}

export interface MergedItem {
  units: Unit[];
  topics: string[];
  /** Highest stage among the members; null when no member has a stage (older answers, or "other" only). */
  stage: number | null;
  documents: string[];
}

/** Counts per stage (0..4) plus findings without a stage ("other"). */
export interface StageCounts {
  byStage: number[];
  unstaged: number;
  total: number;
}

export function count(items: MergedItem[]): StageCounts {
  const byStage = [0, 0, 0, 0, 0];
  let unstaged = 0;
  for (const m of items) {
    if (m.stage === null) unstaged++;
    else byStage[m.stage]++;
  }
  return { byStage, unstaged, total: items.length };
}

/** Merge only matching assertions with shared evidence, never unrelated statements in one quote. */
export function mergeUnits(units: Unit[], sourceClaims = false): MergedItem[] {
  const parent = units.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byQuote = new Map<string, number>();
  units.forEach((u, i) => {
    // Deliberately conservative: different wording may remain separate, but a long
    // quotation cannot collapse distinct programmes, statistics, targets or conditions.
    const assertion = u.text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").replace(/[.;\s]+$/, "").trim();
    const figures = JSON.stringify((u.figures ?? []).map(f => [f.value_as_stated, f.unit, f.period, f.conditionality]).sort());
    if (sourceClaims && u.citations.length) {
      // Exact restatements at the same progression state count once across documents.
      // Different text, figures or states remain distinct; do not infer semantic equivalence.
      const key = JSON.stringify([assertion,figures,[...unitStatementTypes(u)].sort()]);
      const previous = byQuote.get(key);
      if (previous === undefined) byQuote.set(key,i);
      else parent[find(i)] = find(previous);
      return;
    }
    for (const c of u.citations) {
      const k = JSON.stringify([assertion, figures, c.documentId, c.page, normalise(c.quote).replace(/[.,;:!?…]+$/, "")]);
      const j = byQuote.get(k);
      if (j === undefined) byQuote.set(k, i);
      else parent[find(i)] = find(j);
    }
  });
  const groups = new Map<number, Unit[]>();
  units.forEach((u, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), u]));
  return [...groups.values()].map((members) => {
    const stages = (sourceClaims ? members.flatMap(u=>unitStatementTypes(u).map(statementTypePoints))
      : members.map((u) => (u.kind ? STAGE_OF[u.kind] : null))).filter((s): s is number => s !== null && s !== undefined);
    return {
      units: members,
      topics: [...new Set(members.flatMap((u) => u.topics))].sort(),
      stage: stages.length ? Math.max(...stages) : null,
      documents: [...new Set(members.flatMap((u) => u.citations.map((c) => c.documentId)))].sort(),
    };
  });
}

export function mergeSourceClaims(units: Unit[]) {
  return mergeUnits(units,true);
}

/**
 * How far the latest edition goes compared with the earlier ones (claims.json "stage as of the latest
 * document"). "less" and "not_repeated" are things to read: a newer document not repeating something
 * does not prove it was withdrawn.
 */
export type Trend = "further" | "same" | "less" | "new" | "not_repeated" | null;

export interface StageSummary {
  status: TopicStatus;
  furthest: number | null;
  latest: number | null;
  earlier: number | null;
  trend: Trend;
  documents: string[];
}

function maxStage(items: MergedItem[]) {
  const s = items.map((m) => m.stage).filter((x): x is number => x !== null);
  return s.length ? Math.max(...s) : null;
}

export function stageSummary(items: MergedItem[], latestDocument: string | null, documentCount: number): StageSummary {
  const furthest = maxStage(items);
  const status: TopicStatus = items.length === 0 ? { kind: "none" } : furthest === null ? { kind: "no_stage" } : { kind: "stage", stage: furthest };
  const documents = [...new Set(items.flatMap((m) => m.documents))].sort();
  if (!latestDocument || documentCount < 2 || items.length === 0) {
    return { status, furthest, latest: null, earlier: null, trend: null, documents };
  }
  const latestItems = items.filter((m) => m.documents.includes(latestDocument));
  const earlierItems = items.filter((m) => m.documents.some((d) => d !== latestDocument));
  const latest = maxStage(latestItems);
  const earlier = maxStage(earlierItems);
  let trend: Trend;
  if (latestItems.length === 0) trend = "not_repeated";
  else if (earlierItems.length === 0) trend = "new";
  else {
    const a = latest ?? -1;
    const b = earlier ?? -1;
    trend = a > b ? "further" : a < b ? "less" : "same";
  }
  return { status, furthest, latest, earlier, trend, documents };
}
