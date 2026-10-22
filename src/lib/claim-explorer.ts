import type { CountryTopics } from "./topics";
import type { Unit } from "./topic-merge";
import { classificationValues, DIMENSION_NAMES, type LabelDimension, type SourceClassification, labelName } from "./labels";
import { assessmentTopics, homeDomainId } from "./topic-inventory";
import { canonicalStatementType, groupStatementType, unitStatementTypes } from "./statement-types";
import { claimScore } from "./claim-score";

export interface SearchableClaim {
  id: string;
  iso3: string;
  country: string;
  demo: boolean;
  units: Unit[];
  domains: Array<{ id: string; label: string }>;
  relatedDomains: Array<{ id: string; label: string }>;
  extractionDomains: Array<{ id: string; label: string }>;
  topics: Array<{ id: string; label: string }>;
  documents: string[];
  /** Null means this legacy extraction never classified targets; it does not mean no target. */
  targetClassified: boolean | null;
  classifications: SourceClassification[];
  labeling: "complete" | "partial" | "unavailable";
  labels: Record<LabelDimension, string[]>;
  searchText: string;
}

/** Same unique, active-home-topic groups as the national dashboard, with untagged groups retained. */
export function buildSearchableClaims(country: { iso3: string; name: string }, data: CountryTopics): SearchableClaim[] {
  const enabled = new Set(data.tax.domains.filter(d => d.enabled).map(d => d.id));
  const topicCatalog = new Map(assessmentTopics(data.tax).map(t => [t.id,t]));
  const groups = [...new Set([...data.topics.filter(row => topicCatalog.has(row.topic.id)).flatMap(row => row.items), ...data.untagged])];
  return groups.map(group => {
    const topics = group.topics.flatMap(id => { const t=topicCatalog.get(id); return t ? [{ id:t.id,label:t.label }] : []; });
    const homeIds = new Set(topics.map(t => homeDomainId(topicCatalog.get(t.id)!)));
    const relatedIds = new Set(topics.flatMap(t => topicCatalog.get(t.id)!.placements.map(p => p.domain)));
    const extractionIds = new Set(group.units.map(unit => unit.domainId));
    const domainRows = (ids: Set<string | undefined>) => data.tax.domains.filter(d => enabled.has(d.id) && ids.has(d.id)).map(d => ({ id:d.id,label:d.label }));
    const domains = domainRows(homeIds);
    const relatedDomains = domainRows(relatedIds).filter(d => !homeIds.has(d.id));
    const extractionDomains = domainRows(extractionIds);
    const documents = [...new Set(group.units.flatMap(unit => unit.citations.map(c => c.documentId)))];
    const classifications = [...new Map(group.units.flatMap(u => u.classifications ?? []).map(c => [c.sourceId, c])).values()];
    const labels = Object.fromEntries(Object.keys(DIMENSION_NAMES).map(d => [d, classificationValues(classifications.map(c => c.classification), d as LabelDimension)])) as Record<LabelDimension, string[]>;
    labels.statement_type = [...new Set(group.units.flatMap(unitStatementTypes).filter((type): type is string => type !== null))].sort();
    const complete = group.units.every(u => u.classificationComplete);
    return {
      id: `${country.iso3}:${group.units.map(unit=>`${unit.domainId}:${unit.path}`).sort().join("|")}`,
      iso3: country.iso3, country: country.name, demo: data.hasDemoResults, units: group.units,
      domains, relatedDomains, extractionDomains, topics, documents,
      classifications, labels, labeling: complete ? "complete" : classifications.length ? "partial" : "unavailable",
      targetClassified: labels.fact_type.includes("target") ? true : complete ? false : null,
      searchText: [country.name,country.iso3,...documents,...topics.flatMap(t=>[t.id,t.label]),...[...domains,...relatedDomains,...extractionDomains].map(d=>d.label),
        ...Object.values(labels).flatMap(values=>values.flatMap(value=>[value,labelName(value)])),
        ...classifications.flatMap(c=>[...c.classification.facts.flatMap(f=>[f.text,f.metric,f.period]),...c.classification.actors.map(a=>a.name)]),
        ...group.units.flatMap(unit=>[unit.title,unit.summary,unit.text,unit.kind,...unit.citations.map(c=>c.quote),
          ...(unit.figures??[]).flatMap(f=>[f.value_as_stated,f.unit,f.period]),
          ...(unit.supportingFindings??[]).flatMap(f=>[f.title,f.summary,f.text,...f.citations.map(c=>c.quote)])])
      ].filter(Boolean).join(" ").toLocaleLowerCase(),
    };
  });
}

export type ClaimDomainScope = "home" | "related" | "untagged";

export function claimDomains(row: SearchableClaim, scope: ClaimDomainScope = "home") {
  if (scope === "untagged") return row.topics.length ? [] : row.extractionDomains;
  return scope === "related" ? [...row.domains, ...row.relatedDomains] : row.domains;
}

export function filterClaims(rows: SearchableClaim[], filters: { search?: string; country?: string; domain?: string; domainScope?: ClaimDomainScope; topic?: string; document?: string; stage?: string; labels?: Partial<Record<LabelDimension, string>>; labeling?: string; targetsOnly?: boolean; includeDemo?: boolean }) {
  const query = filters.search?.trim().toLocaleLowerCase();
  return rows.filter(row => (filters.includeDemo || !row.demo)
    && (!filters.country || row.iso3 === filters.country)
    && (filters.domainScope !== "untagged" || row.topics.length === 0)
    && (!filters.domain || claimDomains(row, filters.domainScope).some(d=>d.id===filters.domain))
    && (!filters.topic || row.topics.some(t=>t.id===filters.topic))
    && (!filters.document || row.documents.includes(filters.document))
    && (!filters.stage || (filters.stage === "mixed" ? groupStatementType(row.units) === "mixed"
      : filters.stage === "__unclassified" ? row.units.some(unit => unitStatementTypes(unit).includes(null))
      : row.labels.statement_type.includes(canonicalStatementType(filters.stage)!)))
    && (!filters.labeling || row.labeling === filters.labeling)
    && Object.entries(filters.labels ?? {}).every(([dimension,value])=>!value || (value === "__unlabeled"
      ? row.labels[dimension as LabelDimension].length === 0 : row.labels[dimension as LabelDimension].includes(value)))
    && (!filters.targetsOnly || row.targetClassified === true)
    && (!query || row.searchText.includes(query)));
}

export type ClaimGroup = "none" | "country" | "domain" | "topic" | "document" | LabelDimension;
export type ClaimSort = "title" | "country" | "sources" | "points" | LabelDimension;
export function sortClaims(rows: SearchableClaim[], sort: ClaimSort, descending = false) {
  const title = (r: SearchableClaim) => r.units[0]?.title || r.units[0]?.text || "";
  return [...rows].sort((a,b)=>{
    const value = (r: SearchableClaim) => sort === "title" ? title(r) : sort === "country" ? r.country : sort === "sources" ? r.documents.length : sort === "points" ? claimScore(r.units).points ?? "" : r.labels[sort].map(labelName).join(", ");
    const av=value(a),bv=value(b);
    if (av === "" || bv === "") return av === bv ? a.id.localeCompare(b.id) : av === "" ? 1 : -1;
    const comparison = typeof av === "number" && typeof bv === "number" ? av-bv : String(av).localeCompare(String(bv));
    return (descending ? -comparison : comparison) || title(a).localeCompare(title(b)) || a.id.localeCompare(b.id);
  });
}
export function groupClaims(rows: SearchableClaim[], dimension: ClaimGroup, domainScope: ClaimDomainScope = "home") {
  if (dimension === "none") return [{ key:"all", label:"All claims", rows }];
  const groups = new Map<string, { key:string; label:string; rows:SearchableClaim[] }>();
  for (const row of rows) {
    const values = dimension === "country" ? [{id:row.iso3,label:row.country}] : dimension === "domain" ? claimDomains(row, domainScope) : dimension === "topic" ? row.topics :
      dimension === "document" ? row.documents.map(id=>({id,label:id})) : row.labels[dimension].map(id=>({id,label:labelName(id)}));
    for (const value of values.length ? values : [{id:"__unknown",label:dimension === "domain" || dimension === "topic" ? "Outside assessed topics" : "Not labeled"}]) {
      const group = groups.get(value.id) ?? {key:value.id,label:value.label,rows:[]};
      group.rows.push(row); groups.set(value.id,group);
    }
  }
  return [...groups.values()].sort((a,b)=>a.key==="__unknown"?1:b.key==="__unknown"?-1:a.label.localeCompare(b.label));
}
