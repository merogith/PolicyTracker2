export interface HistoricalJob {
  id: string;
  type: string;
  status: string;
  attempts: number;
  startedAt: string | number | null;
  finishedAt: string | number | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  executionMode?: string;
}

/** Require both an unchanged full-ID backup record and an explicit demo worker log. */
export function confirmedDemoJobs(current: HistoricalJob[], backup: HistoricalJob[], log: string) {
  const evidence = new Map<string, Set<string>>();
  let mode: "demo" | "live" | undefined;
  for (const line of log.split(/\r?\n/)) {
    if (line.includes("[worker] started with")) mode = line.includes("OPENAI_FAKE=1: fake OpenAI") ? "demo" : "live";
    const match = line.match(/^\[worker\] (\w+) .*\(([a-z0-9]{6}), attempt \d+\): done in /);
    if (!match || !mode) continue;
    const key = `${match[1]}:${match[2]}`;
    const modes = evidence.get(key) ?? new Set<string>();
    modes.add(mode);
    evidence.set(key, modes);
  }
  const oldById = new Map(backup.map(job => [job.id, job]));
  return current.filter(job => {
    if (job.executionMode === "demo" || job.status !== "done") return false;
    const key = `${job.type}:${job.id.slice(-6)}`;
    const modes = evidence.get(key);
    if (modes?.size !== 1 || !modes.has("demo")) return false;
    // Short IDs in logs are not unique by definition.
    if (current.filter(other => other.type === job.type && other.id.slice(-6) === job.id.slice(-6)).length !== 1) return false;
    const old = oldById.get(job.id);
    return old?.status === "done" && old.type === job.type && old.attempts === job.attempts
      && old.startedAt === job.startedAt && old.finishedAt === job.finishedAt
      && old.costUsd === job.costUsd && old.inputTokens === job.inputTokens && old.outputTokens === job.outputTokens;
  });
}
