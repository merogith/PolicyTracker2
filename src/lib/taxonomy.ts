// The taxonomy: domains and topics, edited in the dashboard and stored in the database. It is seeded
// once from fresh-start/config/taxonomy.json. The model picks topic IDs only; domains and groups are
// derived from each topic's placements. A topic may sit in several domains, so domain counts overlap
// and are never added together. Each domain is also the question asked of every document.
import { cache } from "react";
import taxonomyJson from "../../fresh-start/config/taxonomy.json";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { homeTopics, relatedTopics } from "./topic-inventory";

export interface DomainGroup {
  id: string;
  label: string;
}

export interface Domain {
  id: string;
  prefix: string;
  label: string;
  definition: string;
  groups: DomainGroup[];
  searchHints: string[];
  maxResults: number;
  order: number;
  version: number;
  enabled: boolean;
}

export interface Placement {
  domain: string;
  group: string;
}

export interface Routing {
  when: string;
  use: string;
}

export interface Topic {
  id: string;
  label: string;
  definition: string;
  placements: Placement[];
  routing: Routing[];
  legacyIds: string[];
  splitFrom: string[];
  order: number;
}

export interface Taxonomy {
  version: string;
  rules: string[];
  domains: Domain[];
  topics: Topic[];
  /** Active topic IDs as a non-empty tuple, for the JSON-schema enum. */
  topicIds: [string, ...string[]];
  topic(id: string): Topic | undefined;
  domain(id: string): Domain | undefined;
  domainsOfTopic(id: string): string[];
  topicsOfDomain(domainId: string): Topic[];
  groupOf(topicId: string, domainId: string): DomainGroup | undefined;
}

/** The rules from the seed file; they describe how topics are used, not which topics exist. */
export const TAXONOMY_RULES = (taxonomyJson as unknown as { rules: string[] }).rules;

export function makeTaxonomy(version: string, domains: Domain[], topics: Topic[]): Taxonomy {
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const domainById = new Map(domains.map((d) => [d.id, d]));
  const topicsOfDomain = (domainId: string) => {
    return [...homeTopics(topics, domainId), ...relatedTopics(topics, domainId)];
  };
  return {
    version,
    rules: TAXONOMY_RULES,
    domains,
    topics,
    topicIds: (topics.length ? topics.map((t) => t.id) : ["NONE"]) as [string, ...string[]],
    topic: (id) => topicById.get(id),
    domain: (id) => domainById.get(id),
    domainsOfTopic: (id) => (topicById.get(id)?.placements.map((p) => p.domain) ?? []).filter((d) => domainById.has(d)),
    topicsOfDomain,
    groupOf: (topicId, domainId) => {
      const g = topicById.get(topicId)?.placements.find((p) => p.domain === domainId)?.group;
      return domainById.get(domainId)?.groups.find((x) => x.id === g);
    },
  };
}

export function versionString(baseVersion: string, revision: number) {
  return revision > 0 ? `${baseVersion}+r${revision}` : baseVersion;
}

/** The current taxonomy: active domains and topics, in order. */
export async function loadTaxonomy(): Promise<Taxonomy> {
  const [state, domains, topics] = await db.$transaction([
    db.taxonomyState.findUnique({ where: { id: "current" } }),
    db.domain.findMany({ where: { retiredAt: null }, orderBy: { order: "asc" } }),
    db.topic.findMany({ where: { retiredAt: null }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);
  return makeTaxonomy(
    state ? versionString(state.baseVersion, state.revision) : "unseeded",
    domains.map((d) => ({
      id: d.id,
      prefix: d.prefix,
      label: d.label,
      definition: d.definition,
      groups: d.groups as unknown as DomainGroup[],
      searchHints: d.searchHints as unknown as string[],
      maxResults: d.maxResults,
      order: d.order,
      version: d.version,
      enabled: d.enabled,
    })),
    topics.map((t) => ({
      id: t.id,
      label: t.label,
      definition: t.definition,
      placements: t.placements as unknown as Placement[],
      routing: t.routing as unknown as Routing[],
      legacyIds: t.legacyIds as unknown as string[],
      splitFrom: t.splitFrom as unknown as string[],
      order: t.order,
    })),
  );
}

/** The taxonomy as the model reads it: one line per topic, grouped by home domain, with routing hints. */
export function taxonomyPromptText(tax: Taxonomy) {
  const lines: string[] = [];
  for (const d of tax.domains) {
    lines.push(`${d.label} (${d.prefix}): ${d.definition}`);
    for (const t of homeTopics(tax.topics, d.id)) {
      const routing = t.routing.map((r) => `for ${r.when} use ${r.use}`).join("; ");
      lines.push(`- ${t.id} ${t.label}: ${t.definition}${routing ? ` [${routing}]` : ""}`);
    }
  }
  return lines.join("\n");
}

/** The question a domain asks of every document. Changes to it bump the domain's version. */
export function domainQuestion(d: Domain, tax: Taxonomy) {
  const topics = tax.topicsOfDomain(d.id).map((t) => `${t.id} ${t.label}`);
  return `What does the document say about ${d.label} (${d.definition}), and how far has each response gone? Cover its topics: ${topics.join("; ")}.`;
}

/** Phrases to search with: the domain's own hints, then its topic labels. */
export function domainSearchHints(d: Domain, tax: Taxonomy) {
  return [...d.searchHints, ...tax.topicsOfDomain(d.id).map((t) => t.label)];
}

type SeedFile = {
  version: string;
  domains: Array<{ id: string; prefix: string; label: string; definition: string; groups: DomainGroup[] }>;
  topics: Array<{ id: string; label: string; definition: string; placements: Placement[]; routing?: Routing[]; legacy_ids?: string[]; split_from?: string[] }>;
};

/** The seed file as a Taxonomy, without the database (for tests). */
export function taxonomyFromFile(): Taxonomy {
  const raw = taxonomyJson as unknown as SeedFile;
  return makeTaxonomy(
    raw.version,
    raw.domains.map((d, i) => ({ ...d, searchHints: [], maxResults: 20, order: i + 1, version: 1, enabled: true })),
    raw.topics.map((t, i) => ({
      id: t.id,
      label: t.label,
      definition: t.definition,
      placements: t.placements,
      routing: t.routing ?? [],
      legacyIds: t.legacy_ids ?? [],
      splitFrom: t.split_from ?? [],
      order: i + 1,
    })),
  );
}

/** loadTaxonomy, once per server request (for components that each need a label). */
export const loadTaxonomyCached = cache(loadTaxonomy);

/** Seed domains and topics from fresh-start/config/taxonomy.json if the database has none. */
export async function seedTaxonomyFromFile() {
  if ((await db.domain.count()) > 0) return { created: false };
  const raw = taxonomyJson as unknown as SeedFile;
  const json = (v: unknown) => v as Prisma.InputJsonValue;
  await db.$transaction([
    db.taxonomyState.upsert({ where: { id: "current" }, create: { id: "current", baseVersion: raw.version, revision: 0 }, update: {} }),
    ...raw.domains.map((d, i) =>
      db.domain.create({
        data: { id: d.id, prefix: d.prefix, label: d.label, definition: d.definition, groups: json(d.groups), searchHints: [], order: i + 1 },
      }),
    ),
    ...raw.topics.map((t, i) =>
      db.topic.create({
        data: {
          id: t.id,
          label: t.label,
          definition: t.definition,
          placements: json(t.placements),
          routing: json(t.routing ?? []),
          legacyIds: t.legacy_ids ?? [],
          splitFrom: t.split_from ?? [],
          order: i + 1,
        },
      }),
    ),
  ]);
  return { created: true, domains: raw.domains.length, topics: raw.topics.length };
}
