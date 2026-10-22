import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "./db";

export type ExecutionMode = "demo" | "live" | "mixed" | "unknown";
export interface JobUsage {
  executionMode: ExecutionMode;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const currentUsage = new AsyncLocalStorage<JobUsage>();

export function mergeExecutionMode(previous: string, next: ExecutionMode, hadUsage: boolean): ExecutionMode {
  if (previous === "unknown") return hadUsage ? "unknown" : next;
  return previous === next ? next : "mixed";
}

/** One context per attempt; concurrent jobs and classification batches stay isolated. */
export function trackJobUsage<T>(mode: ExecutionMode, fn: (usage: JobUsage) => Promise<T>) {
  const usage: JobUsage = { executionMode: mode, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  return currentUsage.run(usage, () => fn(usage));
}

/** Called for each response, before validation, so invalid answers still count. */
export function recordJobResponse(demo: boolean, usage: { inputTokens: number; outputTokens: number }, costUsd: number) {
  const current = currentUsage.getStore();
  if (!current) return;
  current.executionMode = mergeExecutionMode(current.executionMode, demo ? "demo" : "live", false);
  if (demo) return;
  current.inputTokens += usage.inputTokens;
  current.outputTokens += usage.outputTokens;
  current.costUsd += costUsd;
}

/** Preserve paid attempts on retries and cancellation; never copy costs from a mutable saved answer. */
export async function saveJobUsage(id: string, usage: JobUsage) {
  await db.$transaction(async tx => {
    const previous = await tx.job.findUniqueOrThrow({ where: { id } });
    const demo = usage.executionMode === "demo";
    await tx.job.update({
      where: { id },
      data: {
        executionMode: mergeExecutionMode(previous.executionMode, usage.executionMode,
          Boolean(previous.costUsd || previous.inputTokens || previous.outputTokens)),
        inputTokens: { increment: demo ? 0 : usage.inputTokens },
        outputTokens: { increment: demo ? 0 : usage.outputTokens },
        costUsd: { increment: demo ? 0 : usage.costUsd },
      },
    });
  });
}
