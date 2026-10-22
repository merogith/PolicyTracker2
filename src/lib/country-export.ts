import { db } from "@/lib/db";
import { loadTaxonomy } from "@/lib/taxonomy";
import { LABEL_CATALOGUE } from "@/lib/labels";
import { assessmentTopics, domainTopicInventory, TOPIC_COUNTING_BASIS } from "@/lib/topic-inventory";
import { currentCountryTopics } from "@/lib/topics";
import { currentCountryOverview } from "@/lib/overview";
import { buildDocumentationDashboard } from "@/lib/documentation-score";
import { buildSearchableClaims } from "@/lib/claim-explorer";
import { claimScore, CLAIM_SCORE_VERSION } from "@/lib/claim-score";
import { STATEMENT_TYPES } from "@/lib/statement-types";
import { REGIONAL_NORMALIZATION_DESCRIPTION, REGIONAL_NORMALIZATION_VERSION } from "@/lib/dashboard-metrics";
import { DOCUMENTATION_RUBRIC } from "@/lib/documentation-stage";

import type { Country } from "@/generated/prisma/client";

export async function buildCurrentExport(country: Country) {
  const tax = await loadTaxonomy();
  const [documents, results] = await Promise.all([
    db.document.findMany({
      where: { countryId: country.id, status: { not: "deleting" } },
      orderBy: [{ editionDate: "asc" }, { id: "asc" }],
      include: { pages: { select: { page: true, label: true, disposition: true, text: true }, orderBy: { page: "asc" } } },
    }),
    db.analysisResult.findMany({
      where: { countryId: country.id, domain: { retiredAt: null } },
      orderBy: [{ domainId: "asc" }, { slot: "asc" }, { domainVersion: "desc" }],
      include: { citations: { orderBy: [{ itemPath: "asc" }, { position: "asc" }] } },
    }),
  ]);
  const domainVersion = new Map(tax.domains.map((d) => [d.id, d.version]));
  const [topics,overview] = await Promise.all([currentCountryTopics(country.id,tax),currentCountryOverview(country.id,tax)]);
  const dashboard = buildDocumentationDashboard(topics,overview);

  const body = {
    exported_at: new Date().toISOString(),
    taxonomy: {
      version: tax.version, rules: tax.rules, domains: tax.domains, topics: tax.topics, download: "/api/taxonomy", counting_basis: TOPIC_COUNTING_BASIS,
      assessment_topics: assessmentTopics(tax).map(topic => topic.id),
    },
    label_catalogue: LABEL_CATALOGUE,
    scoring: {
      version: CLAIM_SCORE_VERSION,
      statement_types: STATEMENT_TYPES,
      topic_documentation: DOCUMENTATION_RUBRIC,
      aggregation: "Sum each distinct grouped claim once per topic, domain or country scope. Overlapping topic/domain rows must not be added together.",
      normalization_version: REGIONAL_NORMALIZATION_VERSION,
      normalization: REGIONAL_NORMALIZATION_DESCRIPTION,
      country: dashboard.country,
      domains: dashboard.domains,
      topics: dashboard.topics,
      claims: buildSearchableClaims(country,topics).map(claim=>({id:claim.id,statement_types:claim.labels.statement_type,topics:claim.topics.map(topic=>topic.id),...claimScore(claim.units)})),
    },
    country: { iso3: country.iso3, name: country.name, vector_store_id: country.vectorStoreId },
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      edition_date: d.editionDate,
      language: d.language,
      page_count: d.pageCount,
      pages: d.pages,
      unreadable_pages: d.pages.filter((p) => p.disposition === "unreadable").map((p) => p.page),
      status: d.status,
      sha256: d.sha256,
      openai_file_id: d.openaiFileId,
    })),
    domains: tax.domains.map((d) => ({
      id: d.id,
      prefix: d.prefix,
      label: d.label,
      definition: d.definition,
      question_version: d.version,
      enabled: d.enabled,
      ...domainTopicInventory(tax, d.id),
    })),
    results: results.map((r) => ({
      id: r.id,
      domain_id: r.domainId,
      question_version: r.domainVersion,
      stale: r.domainVersion < (domainVersion.get(r.domainId) ?? r.domainVersion),
      scope: r.scope,
      document_id: r.documentId,
      status: r.status,
      output: r.output,
      model: r.model,
      prompt_version: r.promptVersion,
      taxonomy_version: r.taxonomyVersion,
      usage: { input_tokens: r.inputTokens, cached_tokens: r.cachedTokens, output_tokens: r.outputTokens, reasoning_tokens: r.reasoningTokens, file_search_calls: r.fileSearchCalls },
      cost_usd: r.costUsd,
      sources: r.sources,
      error: r.error,
      finished_at: r.finishedAt,
      citations: r.citations.map((c) => ({
        item: c.itemPath || null,
        document_id: c.documentId,
        page: c.page,
        cited_page: c.citedPage,
        quote: c.quote,
        verified: c.verified,
      })),
    })),
  };
  return body;
}
