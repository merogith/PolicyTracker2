// The scoring layer: a separate, versioned rule (config/scoring/rubric.json) applied by code to the
// furthest documented stage of each topic. Stages stay what they are; a score never replaces them
// (fresh-start/config/claims.json scoring_layer).
import rubricJson from "../../config/scoring/rubric.json";

export interface Rubric {
  id: string;
  version: string;
  status: string;
  points: Record<"no_findings" | "no_stage" | "stage_0" | "stage_1" | "stage_2" | "stage_3" | "stage_4", number | null>;
  domain_rule: string;
  reading: string[];
}

export const RUBRIC = rubricJson as unknown as Rubric;

/** What the findings tagged with a topic show: none, only unstaged items, or a furthest stage 0..4. */
export type TopicStatus = { kind: "none" } | { kind: "no_stage" } | { kind: "stage"; stage: number };

export function topicScore(status: TopicStatus, rubric: Rubric = RUBRIC): number | null {
  if (status.kind === "none") return rubric.points.no_findings;
  if (status.kind === "no_stage") return rubric.points.no_stage;
  return rubric.points[`stage_${status.stage}` as keyof Rubric["points"]];
}

export interface DomainScore {
  sum: number;
  scored: number;
  topics: number;
}

export function domainScore(topicScores: Array<number | null>): DomainScore {
  const scored = topicScores.filter((s): s is number => s !== null);
  return { sum: scored.reduce((a, b) => a + b, 0), scored: scored.length, topics: topicScores.length };
}

export function formatScore(n: number) {
  return n > 0 ? `+${n}` : String(n);
}
