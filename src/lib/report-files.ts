import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { decodeReport, type ReportGraph } from "./report-codec";
import { storageDir } from "./storage";

export function reportSourceHashes(snapshot: unknown) {
  const data = decodeReport<{ export: { documents: Array<{ sha256: string }> } }>(snapshot as ReportGraph);
  return data.export.documents.map(doc => doc.sha256);
}

/** Country deletion removes its archived files only when no other saved report uses them. */
export async function pruneReportSources(candidates: string[]) {
  const remaining = new Set((await db.countryReport.findMany({ select: { snapshot: true } })).flatMap(row => reportSourceHashes(row.snapshot)));
  for (const digest of new Set(candidates)) {
    if (/^[a-f0-9]{64}$/.test(digest) && !remaining.has(digest)) {
      await rm(path.join(storageDir(), "report-sources", `${digest}.pdf`), { force: true });
    }
  }
}
