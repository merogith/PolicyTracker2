// Topic and domain metrics use individual source findings. Narrative country summaries may combine
// different assertions and must not serve as the identity or topic scope of a scored claim.
import { isCurrentEvidencePrompt } from "./analysis/prompt";
import { sourceFindingIndex } from "./claim-presentation";
import { isDemoSource } from "./ai-mode";
import { db } from "./db";
import { domainScore, RUBRIC, topicScore } from "./scoring";
import { loadTaxonomy, type Taxonomy } from "./taxonomy";
import { assessmentTopics, homeDomainId, homeTopics } from "./topic-inventory";
import { count, mergeSourceClaims, stageSummary, type Unit } from "./topic-merge";
import { readReport } from "./report-reader";
import type { DocumentationDashboard } from "./documentation-score";

export { STAGE_KINDS, STAGE_OF, type MergedItem, type StageCounts, type StageSummary, type Trend, type Unit } from "./topic-merge";

type Json = Record<string, unknown>;

export async function currentCountryTopics(countryId: string, taxonomy?: Taxonomy) {
  const tax = taxonomy ?? await loadTaxonomy();
  const domains = tax.domains.filter((d) => d.enabled);
  const version = new Map(domains.map((d) => [d.id, d.version]));
  const [summaries, docResults, documents] = await Promise.all([
    db.analysisResult.findMany({
      where: { countryId, scope: "country", status: "done", domainId: { in: domains.map((d) => d.id) } },
      include: { citations: { orderBy: [{ itemPath: "asc" }, { position: "asc" }] } },
    }),
    db.analysisResult.findMany({
      where: { countryId, scope: "document", status: "done", domainId: { in: domains.map((d) => d.id) }, document: { status: { notIn: ["deleting"] } } },
      select: { id: true, domainId: true, domainVersion: true, documentId: true, output: true, promptVersion: true, taxonomyVersion: true, citations: true },
    }),
    db.document.findMany({ where: { countryId, status: { not: "deleting" } }, orderBy: [{ editionDate: "asc" }, { id: "asc" }], select: { id: true, kind: true, editionDate: true } }),
  ]);
  const current = summaries.filter((r) => version.get(r.domainId) === r.domainVersion);
  const currentDocs = docResults.filter((r) => version.get(r.domainId) === r.domainVersion);
  const sourceIndex = sourceFindingIndex(docResults);
  // Source IDs and exact assertions preserve individual claims and their own topic attribution.
  const units: Unit[] = [];
  for (const r of currentDocs) {
    const domain = tax.domain(r.domainId)!;
    const output = r.output as Json;
    if (output.not_found) continue;
    ((output.findings as Json[]) ?? []).forEach((item, i) => {
      const path = `findings.${i}`;
      const finding = sourceIndex.get(`${r.id}#${path}`);
      if (!finding) return;
      const topics = [...new Set(((item.topic_ids as string[]) ?? []).filter(id=>tax.topic(id)))].sort();
      units.push({
        domainId: domain.id,
        domainLabel: domain.label,
        path: finding.id,
        kind: finding.kind,
        text: finding.text,
        title: finding.title,
        summary: finding.summary,
        figures: finding.figures,
        supportingFindings: [finding],
        sourceFindingsComplete: true,
        classifications: finding.classification ? [{ sourceId:finding.id,documentId:finding.documentId,classification:finding.classification }] : [],
        classificationComplete: !!finding.classification,
        topics,
        citations: r.citations
          .filter((c) => c.itemPath === path)
          .map((c) => ({ id: c.id, documentId: c.documentId, page: c.page, quote: c.quote, verified: c.verified })),
      });
    });
  }
  const merged = mergeSourceClaims(units);
  const tagged = merged.filter((m) => m.topics.length > 0);
  const untagged = merged.filter((m) => m.topics.length === 0);

  const inTopic = (topicId: string) => tagged.filter((m) => m.topics.includes(topicId));
  const eligibleTopics = assessmentTopics(tax);
  const homeByTopic = new Map(eligibleTopics.map(topic => [topic.id, homeDomainId(topic)]));
  const inDomain = (domainId: string) => tagged.filter((m) => m.topics.some((t) => homeByTopic.get(t) === domainId));

  // The newest edition with answers, for "latest edition vs earlier" trends.
  const answered = documents.filter((d) => currentDocs.some((r) => r.documentId === d.id));
  const latestDocument = answered.length ? answered[answered.length - 1].id : null;

  // Status, trend and score of every topic.
  const topicSummaries = new Map(
    tax.topics.map((t) => {
      const items = inTopic(t.id);
      const summary = stageSummary(items, latestDocument, answered.length);
      return [t.id, { topic: t, items, counts: count(items), summary, score: topicScore(summary.status) }] as const;
    }),
  );

  const domainRows = domains.map((d) => {
    const items = inDomain(d.id);
    const topics = homeTopics(eligibleTopics, d.id);
    return {
      domain: d,
      counts: count(items),
      topicsTouched: topics.filter((t) => items.some((m) => m.topics.includes(t.id))).length,
      topicCount: topics.length,
      summary: stageSummary(items, latestDocument, answered.length),
      score: domainScore(topics.map((t) => topicSummaries.get(t.id)!.score)),
      /** The findings that went furthest, for a profile card. */
      highlights: [...items].sort((a, b) => (b.stage ?? -1) - (a.stage ?? -1)).slice(0, 3),
    };
  });

  // What each document's own answers cover, per domain (a finding counts once per domain).
  const docDomains = documents.map((doc) => {
    const perDomain = new Map<string, number>();
    for (const r of currentDocs.filter((x) => x.documentId === doc.id)) {
      const output = r.output as Json;
      if (output.not_found) continue;
      for (const item of (output.findings as Json[]) ?? []) {
        const ds = new Set(((item.topic_ids as string[]) ?? []).flatMap((t) => tax.domainsOfTopic(t)));
        for (const d of ds) perDomain.set(d, (perDomain.get(d) ?? 0) + 1);
      }
    }
    return { document: doc, perDomain };
  });

  // Concepts no topic fitted, as the documents' answers report them.
  const unmapped = new Map<string, Set<string>>();
  for (const r of currentDocs) {
    for (const item of ((r.output as Json).findings as Json[]) ?? []) {
      for (const c of (item.unmapped_concepts as string[]) ?? []) unmapped.set(c, (unmapped.get(c) ?? new Set()).add(r.documentId!));
    }
  }

  const outdated = [...current, ...currentDocs].filter((r) => !isCurrentEvidencePrompt(r.promptVersion)).length;
  const retagPending = currentDocs.filter((r) => r.taxonomyVersion !== tax.version).length;

  return {
    tax,
    ready: current.length > 0,
    hasDemoResults: current.some((result) => isDemoSource(result.sources)),
    domains: domainRows,
    docDomains,
    documents,
    untagged,
    unmapped: [...unmapped].map(([concept, docs]) => ({ concept, documents: [...docs].sort() })),
    outdated,
    retagPending,
    topicItems: inTopic,
    topicCounts: (topicId: string) => count(inTopic(topicId)),
    topics: [...topicSummaries.values()],
    topicSummary: (topicId: string) => topicSummaries.get(topicId),
    latestDocument,
    rubric: RUBRIC,
    mergedCount: merged.length,
    unitCount: units.length,
  };
}

export type CountryTopics = Awaited<ReturnType<typeof currentCountryTopics>> & { savedDashboards?: Record<string, DocumentationDashboard> };

export async function countryTopics(countryId: string, taxonomy?: Taxonomy, reportId?: string): Promise<CountryTopics> {
  return (await readReport(countryId, reportId))?.data.topics ?? currentCountryTopics(countryId, taxonomy);
}
