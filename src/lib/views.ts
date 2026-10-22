// Data for result cards: per domain, the answer to show, whether it is stale, and what is pending.
import type { AnalysisResult, Citation, Job } from "@/generated/prisma/client";
import { db } from "./db";
import { sourceFindingIndex, resolveSupportingFindings, type SupportingFinding } from "./claim-presentation";
import type { Domain } from "./taxonomy";
import { readReport } from "./report-reader";

export type ResultWithCitations = AnalysisResult & { citations: Citation[] };

export interface CardData {
  domain: Domain;
  /** The newest finished answer, possibly from an older domain version. */
  result: ResultWithCitations | null;
  stale: boolean;
  /** Tagged with an older taxonomy version and not yet re-tagged. */
  retagPending: boolean;
  /** Work queued or running for this card. */
  pending: "queued" | "running" | null;
  /** Error of the latest attempt at the current version, if it failed. */
  error: string | null;
  /** Country cards: each finding's topics, from the document findings it cites. */
  findingTopics?: Record<string, string[]>;
  supportingFindings?: Record<string, SupportingFinding[]>;
}

function cardsFor(domains: Domain[], results: ResultWithCitations[], jobs: Job[], jobPrefix: string, taxonomyVersion: string): CardData[] {
  return domains.map((domain) => {
    const mine = results.filter((r) => r.domainId === domain.id).sort((a, b) => b.domainVersion - a.domainVersion);
    const current = mine.find((r) => r.domainVersion === domain.version) ?? null;
    const shown = mine.find((r) => r.status === "done" && r.output !== null) ?? null;
    const job = jobs.find((j) => j.dedupeKey === `${jobPrefix}:${domain.id}`);
    const pending = job ? (job.status as "queued" | "running") : current?.status === "running" ? "running" : null;
    return {
      domain,
      result: shown,
      stale: shown !== null && shown.domainVersion < domain.version,
      retagPending: shown !== null && shown.scope === "document" && shown.taxonomyVersion !== taxonomyVersion,
      pending,
      error: current?.status === "failed" ? current.error : null,
    };
  });
}

export async function documentCards(documentId: string, domains: Domain[], taxonomyVersion: string) {
  const [results, jobs] = await Promise.all([
    db.analysisResult.findMany({
      where: { documentId, scope: "document" },
      include: { citations: { orderBy: [{ itemPath: "asc" }, { position: "asc" }] } },
    }),
    db.job.findMany({ where: { documentId, type: "analyse_document_domain", status: { in: ["queued", "running"] } } }),
  ]);
  return cardsFor(domains.filter((d) => d.enabled), results, jobs, `analyse_document_domain:${documentId}`, taxonomyVersion);
}

export async function currentCountryCards(countryId: string, domains: Domain[], taxonomyVersion: string) {
  const [results, jobs, docResults] = await Promise.all([
    db.analysisResult.findMany({
      where: { countryId, scope: "country" },
      include: { citations: { orderBy: [{ itemPath: "asc" }, { position: "asc" }] } },
    }),
    db.job.findMany({ where: { countryId, type: "synthesise_country_domain", status: { in: ["queued", "running"] } } }),
    db.analysisResult.findMany({ where: { countryId, scope: "document", status: "done" }, select: { id: true, documentId: true, output: true, citations: true } }),
  ]);
  const sourceIndex = sourceFindingIndex(docResults);
  const outputs = new Map(docResults.map((r) => [r.id, r.output as { findings?: Array<{ topic_ids?: string[] }> }]));
  const cards = cardsFor(domains.filter((d) => d.enabled), results, jobs, `synthesise_country_domain:${countryId}`, taxonomyVersion);
  for (const card of cards) {
    const refs = ((card.result?.sources as { itemRefs?: Record<string, Array<{ resultId: string; path: string }>> } | null)?.itemRefs ?? {}) as Record<
      string,
      Array<{ resultId: string; path: string }>
    >;
    card.supportingFindings = Object.fromEntries(Object.entries(refs).map(([path, list]) => [path, resolveSupportingFindings(list, sourceIndex, card.result?.citations.filter(c => c.itemPath === path) ?? [])]));
    card.findingTopics = Object.fromEntries(
      Object.entries(refs).map(([path, list]) => [
        path,
        [...new Set(list.flatMap((ref) => outputs.get(ref.resultId)?.findings?.[Number(ref.path.split(".")[1])]?.topic_ids ?? []))].sort(),
      ]),
    );
  }
  return cards;
}

export async function countryCards(countryId: string, domains: Domain[], taxonomyVersion: string, reportId?: string) {
  return (await readReport(countryId, reportId))?.data.cards ?? currentCountryCards(countryId, domains, taxonomyVersion);
}

export function verifiedRate(cards: CardData[]) {
  const all = cards.flatMap((c) => c.result?.citations ?? []);
  return { total: all.length, verified: all.filter((c) => c.verified).length };
}
