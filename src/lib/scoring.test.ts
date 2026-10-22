import assert from "node:assert/strict";
import { test } from "node:test";
import { domainScore, RUBRIC, topicScore, type Rubric } from "./scoring";
import { stageSummary, type MergedItem } from "./topic-merge";

const item = (stage: number | null, documents: string[]): MergedItem => ({ units: [], topics: ["X"], stage, documents });

test("rubric v2: responses score +1, concerns and unstaged 0, no findings -1", () => {
  assert.equal(RUBRIC.version.split(".")[0], "2");
  assert.equal(topicScore({ kind: "none" }), -1);
  assert.equal(topicScore({ kind: "no_stage" }), 0);
  assert.equal(topicScore({ kind: "stage", stage: 0 }), 0);
  for (const stage of [1, 2, 3, 4]) assert.equal(topicScore({ kind: "stage", stage }), 1);
});

test("leaving empty topics unscored (rubric v1) is a config change", () => {
  const v1: Rubric = { ...RUBRIC, points: { ...RUBRIC.points, no_findings: null } };
  assert.equal(topicScore({ kind: "none" }, v1), null);
});

test("with v2 every topic of a domain is scored, so empty topics pull the sum down", () => {
  const scores = [{ kind: "stage" as const, stage: 2 }, { kind: "none" as const }, { kind: "stage" as const, stage: 0 }, { kind: "none" as const }].map((s) => topicScore(s));
  assert.deepEqual(domainScore(scores), { sum: -1, scored: 4, topics: 4 });
});

test("domain score sums scored topics and reports how many were scored", () => {
  assert.deepEqual(domainScore([1, 0, null, 1, null]), { sum: 2, scored: 3, topics: 5 });
  assert.deepEqual(domainScore([null, null]), { sum: 0, scored: 0, topics: 2 });
});

test("status is the furthest stage; unstaged-only and empty are distinct", () => {
  assert.deepEqual(stageSummary([item(1, ["A"]), item(3, ["A"])], "A", 1).status, { kind: "stage", stage: 3 });
  assert.deepEqual(stageSummary([item(null, ["A"])], "A", 1).status, { kind: "no_stage" });
  assert.deepEqual(stageSummary([], "A", 1).status, { kind: "none" });
});

test("trend compares the latest edition with the earlier ones", () => {
  assert.equal(stageSummary([item(1, ["A"]), item(3, ["B"])], "B", 2).trend, "further");
  assert.equal(stageSummary([item(3, ["A"]), item(1, ["B"])], "B", 2).trend, "less");
  assert.equal(stageSummary([item(2, ["A", "B"])], "B", 2).trend, "same");
  assert.equal(stageSummary([item(2, ["B"])], "B", 2).trend, "new");
  assert.equal(stageSummary([item(2, ["A"])], "B", 2).trend, "not_repeated");
  assert.equal(stageSummary([item(2, ["A"])], "A", 1).trend, null);
});
