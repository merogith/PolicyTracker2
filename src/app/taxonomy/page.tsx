import { Fact, PageHeader } from "@/components/page-header";
import { TaxonomyEditor, type EditorDomain, type EditorTopic } from "@/components/taxonomy-editor";
import { db } from "@/lib/db";
import { loadTaxonomyCached } from "@/lib/taxonomy";
import { assessmentTopics } from "@/lib/topic-inventory";

export default async function TaxonomyPage() {
  const tax = await loadTaxonomyCached();
  const [answers, retired] = await Promise.all([
    db.analysisResult.groupBy({ by: ["domainId"], where: { scope: "document", status: "done" }, _count: true }),
    db.topic.count({ where: { retiredAt: { not: null } } }),
  ]);
  const domains: EditorDomain[] = tax.domains.map((d) => ({
    id: d.id,
    prefix: d.prefix,
    label: d.label,
    definition: d.definition,
    groups: d.groups as EditorDomain["groups"],
    searchHints: d.searchHints as string[],
    maxResults: d.maxResults,
    version: d.version,
    enabled: d.enabled,
    answers: answers.find((a) => a.domainId === d.id)?._count ?? 0,
  }));
  const topics: EditorTopic[] = tax.topics.map((t) => ({
    id: t.id,
    label: t.label,
    definition: t.definition,
    placements: t.placements,
    routing: t.routing,
    legacyIds: t.legacyIds,
  }));

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Domains & topics" }]}
        title="Domains & topics"
        meta={
          <>
            <Fact tone="primary">taxonomy {tax.version}</Fact>
            <Fact>{domains.length} domains</Fact>
            <Fact>{topics.length} unique topics</Fact>
            {assessmentTopics(tax).length !== topics.length && <Fact>{assessmentTopics(tax).length} in enabled home domains</Fact>}
            {retired > 0 && <Fact>{retired} retired</Fact>}
          </>
        }
      />
      <TaxonomyEditor domains={domains} topics={topics} />
    </div>
  );
}
