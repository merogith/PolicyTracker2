import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { confirmedDemoJobs, type HistoricalJob } from "../src/lib/demo-usage-repair";

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Required: ${name} PATH`);
    return path.resolve(args[index + 1]);
  };
  const backupPath = value("--demo-backup");
  const logPath = value("--demo-log");
  const apply = args.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) throw new Error("A local SQLite DATABASE_URL is required");
  const databasePath = path.resolve(url.slice(5));
  if (backupPath === databasePath) throw new Error("Evidence backup must be separate from the working database");
  const database = new Database(databasePath, { readonly: !apply, fileMustExist: true });
  const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const jobs = database.prepare("SELECT * FROM Job").all() as HistoricalJob[];
    const old = backup.prepare("SELECT * FROM Job").all() as HistoricalJob[];
    const log = readFileSync(logPath, "utf8");
    const confirmed = confirmedDemoJobs(jobs, old, log);
    const before = jobs.reduce((sum, job) => sum + job.costUsd, 0);
    const removed = confirmed.reduce((sum, job) => sum + job.costUsd, 0);
    const report = {
      applied: apply, evidence: { backupPath, logPath }, jobs: confirmed,
      demoRuns: confirmed.length, chargedDemoRuns: confirmed.filter(job => job.costUsd > 0).length,
      beforeUsd: before, removedDemoUsd: removed, afterUsd: before - removed,
      removedInputTokens: confirmed.reduce((sum, job) => sum + job.inputTokens, 0),
      removedOutputTokens: confirmed.reduce((sum, job) => sum + job.outputTokens, 0),
    };
    if (apply && confirmed.length) {
      const directory = path.resolve("output/demo-usage-repair", new Date().toISOString().replace(/[:.]/g, "-"));
      mkdirSync(directory, { recursive: true });
      await database.backup(path.join(directory, "before.db"));
      writeFileSync(path.join(directory, "plan.json"), JSON.stringify({ ...report, applied: false }, null, 2));
      database.transaction(() => {
        const latest = database.prepare("SELECT * FROM Job").all() as HistoricalJob[];
        const checked = confirmedDemoJobs(latest, old, log);
        if (JSON.stringify(checked) !== JSON.stringify(confirmed)) throw new Error("Jobs changed during audit; rerun the repair");
        const update = database.prepare("UPDATE Job SET costUsd = 0, inputTokens = 0, outputTokens = 0, executionMode = 'demo' WHERE id = ?");
        for (const job of confirmed) update.run(job.id);
      })();
      writeFileSync(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
      console.log(`Backup and audit: ${directory}`);
    }
    const { jobs: _jobs, ...summary } = report;
    void _jobs;
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    database.close();
    backup.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
