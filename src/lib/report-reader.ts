import { db } from "./db";
import { decodeReport, type ReportGraph } from "./report-codec";
import { makeTaxonomy, type Taxonomy } from "./taxonomy";
import { count } from "./topic-merge";
import type { CountryTopics } from "./topics";
import type { CountryOverview } from "./overview";
import type { CardData } from "./views";
import type { DocumentationDashboard } from "./documentation-score";
import { UserError } from "./errors";
import { cache } from "react";

export interface ReportData {
  version: 1;
  taxonomy: Taxonomy;
  topics: CountryTopics;
  overview: CountryOverview;
  cards: CardData[];
  documentCards: Record<string, CardData[]>;
  dashboards: Record<string, DocumentationDashboard>;
  export: Record<string, unknown>;
}

export function hydrateReport(graph: ReportGraph): ReportData {
  const data = decodeReport<ReportData>(graph);
  if (data.version !== 1) throw new Error("Unsupported report format");
  const tax = makeTaxonomy(data.taxonomy.version, data.taxonomy.domains, data.taxonomy.topics);
  tax.rules = data.taxonomy.rules;
  data.taxonomy = tax;
  data.topics.tax = tax;
  data.overview.tax = tax;
  const byTopic = new Map(data.topics.topics.map(row => [row.topic.id, row]));
  data.topics.topicItems = id => byTopic.get(id)?.items ?? [];
  data.topics.topicCounts = id => count(data.topics.topicItems(id));
  data.topics.topicSummary = id => byTopic.get(id);
  data.topics.savedDashboards = data.dashboards;
  const exported = data.export as { country: { iso3: string }; scoring: { claims: Array<{ id: string; points: number | null; reason: string; sourceMatched: boolean }> } };
  const scores = new Map(exported.scoring.claims.map(score => [score.id, score]));
  for (const item of new Set([...data.topics.topics.flatMap(row => row.items), ...data.topics.untagged])) {
    const members = item.units.map(unit => `${unit.domainId}:${unit.path}`).sort().join("|");
    const score = scores.get(`${exported.country.iso3}:${members}`);
    if (score) for (const unit of item.units) unit.savedGroupScore = { members, score: { points: score.points, reason: score.reason, sourceMatched: score.sourceMatched } };
  }
  return data;
}

/** An explicit ID previews history; otherwise use the chosen main report. Never silently fall back for a bad ID. */
export const readReport = cache(async (countryId: string, reportId?: string) => {
  const id = reportId ?? (await db.country.findUnique({ where: { id: countryId }, select: { mainReportId: true } }))?.mainReportId;
  if (!id) return null;
  const row = await db.countryReport.findFirst({ where: { id, countryId } });
  if (!row) throw new UserError("Report not found for this country", 404);
  return { id: row.id, title: row.title, createdAt: row.createdAt, data: hydrateReport(row.snapshot as unknown as ReportGraph) };
});

export function reportDocument(data: ReportData, id: string) {
  const docs = data.export.documents as Array<{
    id: string; title: string; kind: string; edition_date: string; page_count: number; status: string; sha256: string;
    pages: Array<{ page: number; label: string | null; text: string; disposition: string }>;
  }>;
  const doc = docs.find(d => d.id === id);
  return doc ? { id: doc.id, title: doc.title, kind: doc.kind, editionDate: doc.edition_date, pageCount: doc.page_count,
    status: doc.status, error: null, sha256: doc.sha256,
    pages: doc.pages.map(page => ({ ...page, documentId: doc.id, openaiFileId: null })),
  } : null;
}
