import { loadTaxonomy } from "@/lib/taxonomy";
import { assessmentTopics, domainTopicInventory, homeDomainId, TOPIC_COUNTING_BASIS } from "@/lib/topic-inventory";

/** The current taxonomy in the shape of fresh-start/config/taxonomy.json, for download. */
export async function GET() {
  const tax = await loadTaxonomy();
  const body = {
    version: tax.version,
    counting_basis: TOPIC_COUNTING_BASIS,
    assessment_topics: assessmentTopics(tax).map(topic => topic.id),
    rules: tax.rules,
    domains: tax.domains.map((d) => ({
      id: d.id, prefix: d.prefix, label: d.label, definition: d.definition, groups: d.groups,
      enabled: d.enabled, question_version: d.version, ...domainTopicInventory(tax, d.id),
    })),
    topics: tax.topics.map((t) => ({
      id: t.id,
      label: t.label,
      definition: t.definition,
      placements: t.placements,
      home_domain: homeDomainId(t),
      routing: t.routing,
      legacy_ids: t.legacyIds,
      ...(t.splitFrom.length ? { split_from: t.splitFrom } : {}),
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="taxonomy-${tax.version}.json"` },
  });
}
