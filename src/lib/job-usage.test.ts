import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { z } from "zod";
import { db } from "./db";
import { trackJobUsage, saveJobUsage } from "./job-usage";
import { callStructured } from "./analysis/call";
import { costUsd } from "./analysis/pricing";
import type { StructuredResult } from "./openai";

const directory = mkdtempSync(path.join(tmpdir(), "policy-usage-"));
process.env.DATABASE_URL = `file:${path.join(directory, "usage.db").replaceAll("\\", "/")}`;
const sql = new Database(path.join(directory, "usage.db"));
for (const name of readdirSync("prisma/migrations").filter(n => /^\d/.test(n)).sort()) {
  sql.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
}
sql.close();
after(async () => {
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

const request = {
  model: "gpt-6-luna", schema: z.object({ answer: z.string() }),
  schemaName: "usage_test", instructions: "Test", text: "Test",
};
const response = (demo = false, valid = true): StructuredResult => ({
  outputText: valid ? '{"answer":"Test"}' : "invalid JSON",
  responseId: demo ? "resp_fake_test" : "resp_live_test", refusal: null, incomplete: null,
  usage: { inputTokens: 1000, cachedTokens: 200, outputTokens: 100, reasoningTokens: 20 },
  fileSearchCalls: 1, queries: [], retrieved: [],
});
const price = costUsd(request.model, response().usage, 1);

test("demo success, validation retries, and transport errors never create billable usage", async () => {
  await trackJobUsage("demo", async usage => {
    const call = await callStructured(request, { fake: true, structured: async () => response(false) });
    assert.equal(call.costUsd, 0, "gateway flag suffices even without a fake response ID");
    assert.equal(call.usage.inputTokens, 0);
    const byId = await callStructured(request, { structured: async () => response(true) });
    assert.equal(byId.costUsd, 0, "response provenance suffices even without the gateway flag");
    await assert.rejects(callStructured(request, { structured: async () => response(true, false) }), error => {
      assert.equal((error as { costUsd: number }).costUsd, 0);
      return true;
    });
    let calls = 0;
    await assert.rejects(callStructured(request, { fake: true, structured: async () => {
      if (calls++) throw new Error("transport failure");
      return response(true, false);
    } }), error => {
      assert.equal((error as { costUsd: number }).costUsd, 0);
      return true;
    });
    assert.deepEqual(usage, { executionMode: "demo", inputTokens: 0, outputTokens: 0, costUsd: 0 });
  });
});

test("live responses count once per attempt, including invalid answers and later network failures", async () => {
  await trackJobUsage("live", async usage => {
    let calls = 0;
    const call = await callStructured(request, { structured: async () => response(false, Boolean(calls++)) });
    assert.equal(call.costUsd, 2 * price);
    assert.equal(usage.costUsd, 2 * price);
    calls = 0;
    await assert.rejects(callStructured(request, { structured: async () => {
      if (calls++) throw new Error("transport failure");
      return response(false, false);
    } }), /transport failure/);
    assert.equal(usage.inputTokens, 3000);
    assert.equal(usage.outputTokens, 300);
    assert.ok(Math.abs(usage.costUsd - 3 * price) < 1e-12);
  });
});

test("concurrent demo and live job accounting is isolated", async () => {
  const [demo, live] = await Promise.all([
    trackJobUsage("demo", async usage => {
      await callStructured(request, { fake: true, structured: async () => response(true) });
      return usage;
    }),
    trackJobUsage("live", async usage => {
      await Promise.all([1, 2].map(() => callStructured(request, { structured: async () => response() })));
      return usage;
    }),
  ]);
  assert.equal(demo.costUsd, 0);
  assert.equal(demo.inputTokens, 0);
  assert.equal(live.costUsd, price * 2);
  assert.equal(live.inputTokens, 2000);
});

test("persisted retries accumulate and cancellation does not erase usage; demo retries preserve paid history", async () => {
  const job = await db.job.create({ data: { type: "analyse_document_domain", dedupeKey: "usage", payload: {}, status: "cancelled" } });
  for (const mode of ["live", "live", "demo"] as const) {
    await trackJobUsage(mode, async usage => {
      await callStructured(request, { fake: mode === "demo", structured: async () => response(mode === "demo") });
      await saveJobUsage(job.id, usage);
    });
  }
  const saved = await db.job.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(saved.status, "cancelled");
  assert.equal(saved.costUsd, price * 2);
  assert.equal(saved.inputTokens, 2000);
  assert.equal(saved.outputTokens, 200);
  assert.equal(saved.executionMode, "mixed");
  const legacy = await db.job.create({ data: { type: "analyse_document_domain", dedupeKey: "old", payload: {}, costUsd: 1 } });
  await saveJobUsage(legacy.id, { executionMode: "demo", inputTokens: 999, outputTokens: 999, costUsd: 999 });
  const retained = await db.job.findUniqueOrThrow({ where: { id: legacy.id } });
  assert.equal(retained.executionMode, "unknown");
  assert.equal(retained.costUsd, 1, "Do not erase legacy usage based on today's mode");
});
