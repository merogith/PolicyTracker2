import assert from "node:assert/strict";
import { test } from "node:test";
import { taxonomyFromFile, makeTaxonomy } from "./taxonomy";
import { assessmentTopics, domainTopicInventory, homeTopics, relatedTopics } from "./topic-inventory";
import { buildDocumentationDashboard } from "./documentation-score";
import type { CountryTopics } from "./topics";

test("editor inventories, dashboard denominators and export scopes agree for the actual taxonomy", () => {
  const tax = taxonomyFromFile();
  const data = {
    tax, topics: tax.topics.map(topic => ({ topic, items: [] })),
    untagged: [], ready: false, outdated: 0, retagPending: 0,
  } as unknown as CountryTopics;
  const dashboard = buildDocumentationDashboard(data);
  for (const domain of tax.domains) {
    const inventory = domainTopicInventory(tax, domain.id);
    assert.equal(inventory.home_topics.length, homeTopics(tax.topics, domain.id).length);
    assert.deepEqual(inventory.related_topics, relatedTopics(tax.topics, domain.id).map(t => t.id));
    assert.equal(dashboard.domains.find(d => d.id === domain.id)!.topicCount, inventory.topic_count);
    assert.deepEqual(inventory.topics, tax.topicsOfDomain(domain.id).map(t => t.id));
  }
  assert.deepEqual(["climate", "disaster_risk", "agriculture"].map(id => {
    const inventory = domainTopicInventory(tax, id);
    return [inventory.home_topics.length, inventory.related_topics.length];
  }), [[6, 2], [7, 2], [5, 0]]);
  assert.equal(dashboard.country.topicCount, 64);
  assert.equal(dashboard.domains.reduce((sum, d) => sum + d.topicCount, 0), 64);
  assert.equal(tax.domains.reduce((sum, d) => sum + domainTopicInventory(tax, d.id).topics.length, 0), 77);
});

test("disabling a home excludes its topics from assessment even when they remain related elsewhere", () => {
  const tax = taxonomyFromFile();
  tax.domain("nature_land")!.enabled = false;
  const inventory = domainTopicInventory(tax, "climate");
  assert.ok(inventory.related_topics.includes("NAT-04"));
  assert.ok(!assessmentTopics(tax).some(t => t.id === "NAT-04"));
  assert.equal(domainTopicInventory(tax, "nature_land").topic_count, 0);
  assert.equal(domainTopicInventory(tax, "nature_land").home_topics.length, 5);
  tax.domain("nature_land")!.enabled = true;
  assert.equal(assessmentTopics(tax).length, 64);
});

test("home moves, retirement and display reorder derive new counts without stored counters", () => {
  const original = taxonomyFromFile();
  const moved = original.topics.map(t => t.id === "NAT-04"
    ? { ...t, id: "CLM-07", placements: [...t.placements].reverse() } : t);
  const tax = makeTaxonomy("test+r1", [...original.domains].reverse(), moved);
  assert.equal(homeTopics(tax.topics, "climate").length, 7);
  assert.equal(relatedTopics(tax.topics, "climate").length, 1);
  assert.equal(homeTopics(tax.topics, "nature_land").length, 4);
  assert.equal(assessmentTopics(tax).length, 64);
  const retired = makeTaxonomy("test+r2", tax.domains, tax.topics.filter(t => t.id !== "CLM-07"));
  assert.equal(assessmentTopics(retired).length, 63);
  assert.ok(!domainTopicInventory(retired, "nature_land").related_topics.includes("CLM-07"));
});
