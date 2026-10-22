import type { MergedItem, Unit } from "./topic-merge";
import { statementTypePoints, unitStatementTypes } from "./statement-types";
import { normalise } from "./analysis/verify";
import type { Classification } from "./labels";

export const CLAIM_SCORE_VERSION = "unique-claim-points-v1";
export interface ClaimScore {
  points: number | null;
  reason: string;
  sourceMatched: boolean;
}

function hasMatchedType(classification: Classification | undefined, citations: Unit["citations"]) {
  const verified = citations.filter(c => c.verified);
  return classification ? classification.statement_type.quotes.some(quote => verified.some(c => normalise(c.quote).includes(normalise(quote))))
    : verified.length > 0;
}
function sourceMatched(unit: Unit) {
  if (unit.sourceFindingsComplete === false) return false;
  if (unit.supportingFindings?.length) return unit.supportingFindings.every(finding => hasMatchedType(finding.classification,finding.citations));
  if (unit.classifications?.length) return unit.classifications.every(source => hasMatchedType(source.classification,unit.citations.filter(c=>c.documentId===source.documentId)));
  return hasMatchedType(undefined,unit.citations);
}

/** Conflicting duplicates must never inherit their most advanced member's points. */
export function claimScore(units: Unit[], topicIds?: Set<string>): ClaimScore {
  const scoped = units.filter(unit => !topicIds || unit.topics.some(id => topicIds.has(id)));
  if (!scoped.length) return { points: null, reason: "No claim in this topic scope.", sourceMatched: false };
  const members = scoped.map(unit => `${unit.domainId}:${unit.path}`).sort().join("|");
  const saved = scoped[0].savedGroupScore;
  if (saved && saved.members === members && scoped.every(unit => unit.savedGroupScore?.members === members)) return saved.score;
  const matched = scoped.every(sourceMatched);
  const points = scoped.flatMap(unit => unitStatementTypes(unit).map(statementTypePoints));
  if (points.some(value => value === null)) return { points: null, reason: "Statement type not classified; excluded from the observed sum.", sourceMatched: matched };
  if (new Set(points).size !== 1) return { points: null, reason: "Conflicting progression levels; excluded from the observed sum until resolved.", sourceMatched: matched };
  return { points: points[0], sourceMatched: matched, reason: !matched
    ? "Points use the saved statement type. Source quotation matching is incomplete; inspect the evidence."
    : points[0] === 0
    ? "Non-action statement: 0 points."
    : "One unique claim, scored by its reported progression level." };
}

export function sumClaimScores(items: MergedItem[], complete: boolean, available: boolean, topicIds?: Set<string>) {
  const scores = [...new Set(items)].map(item => claimScore(item.units, topicIds));
  const known = scores.flatMap(score => score.points === null ? [] : [score.points]);
  return {
    value: available && (known.length > 0 || (complete && scores.length === 0)) ? known.reduce((a, b) => a + b, 0) : null,
    scoredClaims: known.length,
    unresolvedClaims: scores.length - known.length,
    unmatchedClaims: scores.filter(score => !score.sourceMatched).length,
    totalClaims: scores.length,
    complete: available && complete && known.length === scores.length,
    distribution: [0, 1, 2, 3, 4].map(points => known.filter(value => value === points).length),
  };
}
