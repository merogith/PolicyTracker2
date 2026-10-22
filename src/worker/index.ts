// The worker: takes jobs from the Job table and runs them, WORKER_CONCURRENCY at a time.
// Run one worker process per database; on start it requeues jobs a previous run left "running".
import "dotenv/config";
import type { Job, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { JobType } from "@/lib/domain";
import { claimNext, Defer, Permanent, type JobPayload } from "@/lib/jobs";
import { isTransient } from "@/lib/openai";
import { refreshDocumentStatus } from "@/lib/documents";
import { handlers } from "./handlers";
import { describeJobError } from "@/lib/network";
import { saveCountryReport } from "@/lib/reports";
import { saveJobUsage, trackJobUsage } from "@/lib/job-usage";

const POLL_MS = 1000;
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));
/** Optional comma-separated list of job types this worker takes (default: all). */
const JOB_TYPES = process.env.WORKER_JOB_TYPES?.split(",").map((t) => t.trim()).filter(Boolean);

let stopping = false;

function backoffSeconds(attempts: number) {
  return Math.min(600, 15 * 2 ** (attempts - 1));
}

function log(job: Job, msg: string) {
  const target = [job.documentId, job.domainId].filter(Boolean).join(" ");
  console.log(`[worker] ${job.type} ${target} (${job.id.slice(-6)}, attempt ${job.attempts}): ${msg}`);
}

async function run(job: Job) {
  return trackJobUsage(process.env.OPENAI_FAKE === "1" ? "demo" : "live", async usage => {
    try { await execute(job); }
    finally { await saveJobUsage(job.id, usage); }
  });
}

async function execute(job: Job) {
  const handler = handlers[job.type as JobType] as (p: JobPayload[JobType]) => Promise<unknown>;
  if (!handler) throw new Permanent(`No handler for job type ${job.type}`);
  const started = Date.now();
  try {
    const out = ((await handler(job.payload as unknown as JobPayload[JobType])) ?? {}) as {
      summary?: string;
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
    };
    // A cancel from the dashboard while running wins over "done".
    await db.job.updateMany({
      where: { id: job.id, status: "running" },
      data: {
        status: "done",
        finishedAt: new Date(),
        error: null,
      },
    });
    log(job, `done in ${((Date.now() - started) / 1000).toFixed(1)} s${out.summary ? `; ${out.summary}` : ""}`);
  } catch (err) {
    const message = describeJobError(err);
    if (err instanceof Defer) {
      await db.job.update({
        where: { id: job.id },
        data: { status: "queued", attempts: { decrement: 1 }, runAfter: new Date(Date.now() + err.seconds * 1000), error: message },
      });
      return;
    }
    const retry = !(err instanceof Permanent) && job.attempts < job.maxAttempts && (isTransient(err) || !(err as { status?: number }).status);
    const data: Prisma.JobUpdateInput = retry
      ? { status: "queued", runAfter: new Date(Date.now() + backoffSeconds(job.attempts) * 1000), error: message }
      : { status: "failed", finishedAt: new Date(), error: message };
    await db.job.updateMany({ where: { id: job.id, status: "running" }, data });
    log(job, retry ? `failed, will retry in ${backoffSeconds(job.attempts)} s: ${message}` : `failed: ${message}`);
    if (!retry && job.type === "ingest_document" && job.documentId) {
      await db.document.updateMany({
        where: { id: job.documentId, status: { not: "deleting" } },
        data: { status: "failed", error: message },
      });
    }
  } finally {
    if (job.type === "analyse_document_domain" && job.documentId) await refreshDocumentStatus(job.documentId);
    const countryId = job.countryId ?? (job.type === "retag_result" ? (await db.analysisResult.findUnique({
      where: { id: (job.payload as unknown as JobPayload["retag_result"]).resultId }, select: { countryId: true },
    }))?.countryId : undefined);
    if (countryId && ["analyse_document_domain", "synthesise_country_domain", "retag_result"].includes(job.type)) {
      await saveCountryReport(countryId).catch(err => console.error("[worker] report snapshot", err));
    }
  }
}

async function loop(n: number) {
  while (!stopping) {
    const job = await claimNext(JOB_TYPES);
    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    await run(job).catch((err) => console.error(`[worker ${n}] unexpected`, err));
  }
}

async function main() {
  await db.$executeRawUnsafe("PRAGMA journal_mode=WAL");
  const orphaned = await db.job.updateMany({
    where: { status: "running" },
    data: { status: "queued", runAfter: new Date(), attempts: { decrement: 1 } },
  });
  if (orphaned.count) console.log(`[worker] requeued ${orphaned.count} job(s) left running by a previous worker`);
  // Recover a completed report if a process stopped between job completion and snapshot creation.
  for (const country of await db.country.findMany({ where: { status: "active" }, select: { id: true } })) {
    await saveCountryReport(country.id).catch(err => console.error("[worker] report recovery", err));
  }
  console.log(`[worker] started with concurrency ${CONCURRENCY}${JOB_TYPES ? ` for ${JOB_TYPES.join(", ")}` : ""}${process.env.OPENAI_FAKE === "1" ? " (OPENAI_FAKE=1: fake OpenAI)" : ""}; waiting for jobs`);
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => loop(i + 1)));
  await db.$disconnect();
  console.log("[worker] stopped");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log("[worker] stopping after the running jobs finish (press again to quit now)");
  });
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
