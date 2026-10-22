import rubric from "../../config/scoring/documentation.json";
import type { MergedItem, Unit } from "./topic-merge";
import { claimScore } from "./claim-score";
import { STATEMENT_TYPES } from "./statement-types";

export const DOCUMENTATION_RUBRIC = rubric;
export const ACTION_STAGE_SCALE = STATEMENT_TYPES.filter(type => type.points > 0)
  .map(type => ({ label: type.label, value: rubric.displayMaximum * type.points / rubric.maximum }));

/** Match verification proves the quotation exists, not that its interpretation or delivery is true. */
export function statementPoints(unit: Unit): number | null {
  const score = claimScore([unit]);
  return score.sourceMatched ? score.points : null;
}

/** One vote per distinct claim, scoped to its own topic members; context is not in the denominator. */
export function topicDocumentationAssessment(items: MergedItem[], topicId: string, processed: boolean) {
  const scores = [...new Set(items)]
    .filter(item => item.units.some(unit => unit.topics.includes(topicId)))
    .map(item => claimScore(item.units, new Set([topicId])));
  const unresolved = scores.some(score => score.points === null || !score.sourceMatched);
  const stages = scores.flatMap(score => score.sourceMatched && score.points !== null && score.points > 0 ? [score.points] : []);
  return {
    // Zero is an internal no-action status, never a numerical average shown to the user.
    level: stages.length ? stages.reduce((sum, stage) => sum + stage, 0) / stages.length
      : processed && !unresolved ? 0 : null,
    complete: processed && !unresolved,
  };
}

export function topicDocumentationLevel(items: MergedItem[], topicId: string, processed: boolean): number | null {
  return topicDocumentationAssessment(items, topicId, processed).level;
}

/** Equal topic weighting; no-action and unknown topics have no numerical action-stage average. */
export function aggregateDocumentation(levels: Array<number | null>, complete: boolean) {
  const known = levels.filter((level): level is number => level !== null);
  const scored = known.filter(level => level > 0);
  const assessed = complete && known.length === levels.length && levels.length > 0;
  return {
    version: rubric.version,
    value: scored.length ? rubric.displayMaximum * scored.reduce((sum, level) => sum + level, 0) / (rubric.maximum * scored.length) : null,
    assessedTopics: known.length,
    scoredTopics: scored.length,
    noActionTopics: known.length - scored.length,
    totalTopics: levels.length,
    complete: assessed,
    distribution: [
      known.length - scored.length,
      scored.filter(value => value < 2).length,
      scored.filter(value => value >= 2 && value < 3).length,
      scored.filter(value => value >= 3 && value < rubric.maximum).length,
      scored.filter(value => value === rubric.maximum).length,
    ],
    reason: scored.length === 0 ? assessed ? "No action documented" : "No source-matched action-stage assessment yet"
      : !assessed ? "Provisional average of the action claims assessed so far."
      : "Average action stage, scaled to 100. Each scored topic has equal weight.",
  };
}

export function documentationEmptyLabel(score: ReturnType<typeof aggregateDocumentation>) {
  return score.complete && score.noActionTopics === score.totalTopics ? "No action documented" : "Not assessed";
}
