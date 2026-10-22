// Shared by server metrics and client editors. Keep this module free of database imports.
interface PlacedTopic {
  id: string;
  placements: Array<{ domain: string }>;
}
interface Inventory<T extends PlacedTopic> {
  domains: Array<{ id: string; enabled: boolean }>;
  topics: T[];
}

export const TOPIC_COUNTING_BASIS = "enabled_home_topics" as const;

export function homeDomainId(topic: PlacedTopic): string | undefined {
  return topic.placements[0]?.domain;
}

export function homeTopics<T extends PlacedTopic>(topics: T[], domainId: string): T[] {
  return topics.filter(topic => homeDomainId(topic) === domainId);
}

export function relatedTopics<T extends PlacedTopic>(topics: T[], domainId: string): T[] {
  return topics.filter(topic => homeDomainId(topic) !== domainId && topic.placements.some(p => p.domain === domainId));
}

/** A topic is assessed exactly once, provided its home domain is enabled. */
export function assessmentTopics<T extends PlacedTopic>(tax: Inventory<T>): T[] {
  const enabled = new Set(tax.domains.filter(domain => domain.enabled).map(domain => domain.id));
  return tax.topics.filter(topic => enabled.has(homeDomainId(topic) ?? ""));
}

/** Preserve the complete placement list for retrieval; explicitly separate the assessment scope. */
export function domainTopicInventory<T extends PlacedTopic>(tax: Inventory<T>, domainId: string) {
  const home = homeTopics(tax.topics, domainId);
  const related = relatedTopics(tax.topics, domainId);
  const eligible = homeTopics(assessmentTopics(tax), domainId);
  return {
    topics: [...home, ...related].map(topic => topic.id),
    home_topics: home.map(topic => topic.id),
    related_topics: related.map(topic => topic.id),
    assessment_topics: eligible.map(topic => topic.id),
    topic_count: eligible.length,
    counting_basis: TOPIC_COUNTING_BASIS,
  };
}
