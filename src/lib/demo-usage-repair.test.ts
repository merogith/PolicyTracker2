import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmedDemoJobs, type HistoricalJob } from "./demo-usage-repair";

const job: HistoricalJob = {
  id: "full-job-abcdef", type: "analyse_document_domain", status: "done", attempts: 1,
  startedAt: "2026-10-19T19:37:10Z", finishedAt: "2026-10-19T19:37:11Z",
  inputTokens: 1000, outputTokens: 100, costUsd: 0.1,
};
const completion = "[worker] analyse_document_domain TST water (abcdef, attempt 1): done in 0.1 s";
const log = `[worker] started with concurrency 2 (OPENAI_FAKE=1: fake OpenAI); waiting for jobs\n${completion}`;

test("demo repair requires matching backup usage and an explicit demo completion", () => {
  assert.deepEqual(confirmedDemoJobs([job], [job], log), [job]);
  assert.deepEqual(confirmedDemoJobs([job], [job], completion), []);
  assert.deepEqual(confirmedDemoJobs([job], [], log), []);
  assert.deepEqual(confirmedDemoJobs([{ ...job, costUsd: 0.2 }], [job], log), []);
  assert.deepEqual(confirmedDemoJobs([{ ...job, finishedAt: "later" }], [job], log), []);
  assert.deepEqual(confirmedDemoJobs([{ ...job, executionMode: "demo", costUsd: 0 }], [job], log), []);
});

test("ambiguous log IDs and jobs also run live cannot be erased as demo", () => {
  const duplicate = { ...job, id: "other-job-abcdef" };
  assert.deepEqual(confirmedDemoJobs([job, duplicate], [job, duplicate], log), []);
  assert.deepEqual(confirmedDemoJobs([job], [job], `${log}\n[worker] started with concurrency 2; waiting for jobs\n${completion}`), []);
});
