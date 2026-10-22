import { db } from "./db";
import type { JobType } from "./domain";
import type { Prisma } from "@/generated/prisma/client";

export interface IngestPayload {
  documentId: string;
}
export interface AnalysePayload {
  documentId: string;
  domainId: string;
}
export interface SynthesisePayload {
  countryId: string;
  domainId: string;
}
export interface RetagPayload {
  resultId: string;
}
export interface DeleteDocumentPayload {
  documentId: string;
}
export interface DeleteCountryPayload {
  countryId: string;
}

export type JobPayload = {
  ingest_document: IngestPayload;
  analyse_document_domain: AnalysePayload;
  synthesise_country_domain: SynthesisePayload;
  retag_result: RetagPayload;
  delete_document: DeleteDocumentPayload;
  delete_country: DeleteCountryPayload;
};

export function dedupeKeyFor<T extends JobType>(type: T, payload: JobPayload[T]): string {
  const p = payload as unknown as Record<string, string>;
  switch (type) {
    case "ingest_document":
    case "delete_document":
      return `${type}:${p.documentId}`;
    case "analyse_document_domain":
      return `${type}:${p.documentId}:${p.domainId}`;
    case "synthesise_country_domain":
      return `${type}:${p.countryId}:${p.domainId}`;
    case "retag_result":
      return `${type}:${p.resultId}`;
    case "delete_country":
      return `${type}:${p.countryId}`;
  }
  throw new Error(`unknown job type ${type}`);
}

type Tx = Prisma.TransactionClient | typeof db;

/**
 * Queue a job unless the same work is already queued. A job that is running is not a duplicate:
 * it may have started before the change that asked for this one.
 */
export async function enqueue<T extends JobType>(
  type: T,
  payload: JobPayload[T],
  opts: { runAfter?: Date; countryId?: string; documentId?: string; domainId?: string; tx?: Tx } = {},
) {
  const client = opts.tx ?? db;
  const dedupeKey = dedupeKeyFor(type, payload);
  const existing = await client.job.findFirst({ where: { dedupeKey, status: "queued" } });
  if (existing) return existing;
  const p = payload as Partial<Record<"countryId" | "documentId" | "domainId", string>>;
  return client.job.create({
    data: {
      type,
      payload: payload as unknown as Prisma.InputJsonValue,
      dedupeKey,
      runAfter: opts.runAfter ?? new Date(),
      countryId: opts.countryId ?? p.countryId ?? null,
      documentId: opts.documentId ?? p.documentId ?? null,
      domainId: opts.domainId ?? p.domainId ?? null,
    },
  });
}

const DOCUMENT_WORK = ["ingest_document", "analyse_document_domain"];

/** Claim due work from one document per country, in upload order, across all worker loops. */
export async function claimNext(types?: string[]) {
  return db.$transaction(async (tx) => {
    // Include delayed retries and all job types even when this worker only takes a subset.
    // A completed ingestion must keep its place until all its domain questions finish.
    const work = await tx.job.findMany({
      where: { status: { in: ["queued", "running"] }, type: { in: DOCUMENT_WORK }, documentId: { not: null } },
      select: { documentId: true, status: true },
    });
    const documents = await tx.document.findMany({
      where: { id: { in: work.map((j) => j.documentId!) }, status: { not: "deleting" } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, countryId: true },
    });
    const running = new Set(work.filter((j) => j.status === "running").map((j) => j.documentId));
    const runningCountries = new Set(documents.filter((d) => running.has(d.id)).map((d) => d.countryId));
    const chosenCountries = new Set<string>();
    const blocked: string[] = [];
    for (const doc of documents) {
      if (runningCountries.has(doc.countryId)) {
        // Finish in-flight work before switching documents, including an earlier document's rerun.
        if (!running.has(doc.id)) blocked.push(doc.id);
      } else if (chosenCountries.has(doc.countryId)) {
        blocked.push(doc.id);
      } else {
        chosenCountries.add(doc.countryId);
      }
    }
    const next = await tx.job.findFirst({
      where: {
        status: "queued",
        runAfter: { lte: new Date() },
        ...(types ? { type: { in: types } } : {}),
        OR: [
          { type: { notIn: DOCUMENT_WORK } },
          { documentId: null },
          { documentId: { notIn: blocked } },
        ],
      },
      orderBy: [{ runAfter: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    if (!next) return null;
    const won = await tx.job.updateMany({
      where: { id: next.id, status: "queued" },
      data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    });
    return won.count === 1 ? tx.job.findUniqueOrThrow({ where: { id: next.id } }) : null;
  });
}

/** Thrown by a handler that cannot run yet; the job goes back to the queue without using an attempt. */
export class Defer extends Error {
  constructor(
    readonly seconds: number,
    reason: string,
  ) {
    super(reason);
  }
}

/** Thrown for failures that retrying will not fix. */
export class Permanent extends Error {}

/** Put a failed or cancelled job back in the queue with fresh attempts. */
export async function retryJob(id: string) {
  const job = await db.job.findUnique({ where: { id } });
  if (!job) throw new Error(`No job ${id}`);
  if (job.status !== "failed" && job.status !== "cancelled") throw new Error(`Only failed or cancelled jobs can be retried (this one is ${job.status})`);
  await db.$transaction(async (tx) => {
    await tx.job.update({ where: { id }, data: { status: "queued", attempts: 0, runAfter: new Date(), error: null, finishedAt: null } });
    if (job.documentId && job.type === "ingest_document") {
      await tx.document.updateMany({ where: { id: job.documentId, status: "failed" }, data: { status: "uploaded", error: null } });
    }
    if (job.documentId && job.type === "analyse_document_domain") {
      await tx.document.updateMany({ where: { id: job.documentId, status: { in: ["analysed", "partial"] } }, data: { status: "analysing" } });
    }
  });
}

/** Cancel a queued job, or mark a running one cancelled (its work may still finish). */
export async function cancelJob(id: string) {
  const job = await db.job.findUnique({ where: { id } });
  if (!job) throw new Error(`No job ${id}`);
  if (job.status !== "queued" && job.status !== "running") throw new Error(`Job is already ${job.status}`);
  await db.job.update({ where: { id }, data: { status: "cancelled", finishedAt: new Date(), error: "cancelled from the dashboard" } });
}
