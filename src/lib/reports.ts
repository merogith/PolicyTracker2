import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { loadTaxonomy } from "./taxonomy";
import { currentCountryTopics } from "./topics";
import { currentCountryOverview } from "./overview";
import { currentCountryCards, documentCards } from "./views";
import { buildDocumentationDashboard } from "./documentation-score";
import { CLAIM_STAGES } from "./dashboard-metrics";
import { buildCurrentExport } from "./country-export";
import { encodeReport } from "./report-codec";
import type { ReportData } from "./report-reader";
import { UserError } from "./errors";
import { constants } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { storageDir } from "./storage";

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

/** Includes citation edits as well as output edits. Main selection is outside the signature. */
async function signature(countryId: string, client: Prisma.TransactionClient = db) {
  const [country, documents, results, domains, topics, state] = await Promise.all([
    client.country.findUnique({ where: { id: countryId }, select: { iso3: true, name: true, status: true } }),
    client.document.findMany({ where: { countryId }, orderBy: { id: "asc" } }),
    client.analysisResult.findMany({ where: { countryId }, orderBy: { id: "asc" }, include: { citations: { orderBy: { id: "asc" } } } }),
    client.domain.findMany({ orderBy: { id: "asc" } }),
    client.topic.findMany({ orderBy: { id: "asc" } }),
    client.taxonomyState.findUnique({ where: { id: "current" } }),
  ]);
  return hash({ country, documents, results, domains, topics, state });
}

/** Save a settled, complete set. Existing reports and the user's main selection are never overwritten. */
export async function saveCountryReport(countryId: string, title?: string) {
  const country = await db.country.findUnique({ where: { id: countryId } });
  if (!country || country.status !== "active") return null;
  if (await db.job.count({ where: { countryId, status: { in: ["queued", "running"] } } })) return null;
  const fingerprint = await signature(countryId);
  const existing = await db.countryReport.findUnique({ where: { countryId_fingerprint: { countryId, fingerprint } } });
  // Content-addressed originals outlive deletion/replacement of a working document.
  const archive = path.join(storageDir(), "report-sources");
  await mkdir(archive, { recursive: true });
  for (const doc of await db.document.findMany({ where: { countryId, status: { not: "deleting" } } })) {
    if (!/^[a-f0-9]{64}$/.test(doc.sha256)) throw new Error("Invalid PDF digest");
    await copyFile(path.join(storageDir(), doc.pdfPath), path.join(archive, `${doc.sha256}.pdf`), constants.COPYFILE_EXCL)
      .catch(error => { if (error.code !== "EEXIST") throw error; });
  }
  if (existing) return existing;
  const tax = await loadTaxonomy();
  const [topics, overview] = await Promise.all([currentCountryTopics(countryId, tax), currentCountryOverview(countryId, tax)]);
  if (!overview.documents.length || !overview.domains.length || topics.retagPending > 0 ||
    overview.documents.some(d => !["analysed", "partial"].includes(d.status)) ||
    overview.coverage.some(row => row.summaryStatus !== "done" || row.cells.some(c => !["found", "not_found"].includes(c.status)))) return null;
  const [cards, entries, exported] = await Promise.all([
    currentCountryCards(countryId, tax.domains, tax.version),
    Promise.all(overview.documents.map(async doc => [doc.id, await documentCards(doc.id, tax.domains, tax.version)] as const)),
    buildCurrentExport(country),
  ]);
  const dashboards: ReportData["dashboards"] = {};
  for (let mask = 0; mask < 2 ** CLAIM_STAGES.length; mask++) {
    const stages = CLAIM_STAGES.filter((_, i) => mask & (1 << i)).map(stage => stage.value).sort((a, b) => a - b);
    dashboards[stages.join(",")] = buildDocumentationDashboard(topics, overview, stages);
  }
  const data: ReportData = { version: 1, taxonomy: tax, topics, overview, cards, documentCards: Object.fromEntries(entries), dashboards, export: exported };
  const snapshot = encodeReport(data) as unknown as Prisma.InputJsonValue;
  return db.$transaction(async tx => {
    if (await tx.job.count({ where: { countryId, status: { in: ["queued", "running"] } } }) ||
      await signature(countryId, tx) !== fingerprint) return null;
    const duplicate = await tx.countryReport.findUnique({ where: { countryId_fingerprint: { countryId, fingerprint } } });
    if (duplicate) return duplicate;
    const report = await tx.countryReport.create({ data: {
      countryId, fingerprint, snapshot,
      title: title ?? `Analysis · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    } });
    await tx.country.updateMany({ where: { id: countryId, mainReportId: null }, data: { mainReportId: report.id } });
    return report;
  }, { timeout: 30000 });
}

export async function setMainReport(countryId: string, reportId: string) {
  return db.$transaction(async tx => {
    const report = await tx.countryReport.findFirst({ where: { id: reportId, countryId, country: { status: "active" } }, select: { id: true } });
    if (!report) throw new UserError("Report not found for this country", 404);
    await tx.country.update({ where: { id: countryId }, data: { mainReportId: report.id } });
    return { id: report.id };
  });
}

export function listReports(countryId: string) {
  return db.countryReport.findMany({ where: { countryId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, title: true, createdAt: true } });
}
