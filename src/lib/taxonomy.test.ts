import assert from "node:assert/strict";
import { test } from "node:test";
import { domainQuestion, makeTaxonomy, taxonomyFromFile, taxonomyPromptText, versionString } from "./taxonomy";

const tax = taxonomyFromFile();

test("seed file: 16 domains, 64 unique topics, valid placements, prefixes match home", () => {
  assert.equal(tax.domains.length, 16);
  assert.equal(tax.topics.length, 64);
  assert.equal(new Set(tax.topicIds).size, tax.topicIds.length);
  for (const t of tax.topics) {
    assert.ok(t.placements.length > 0, `${t.id} has a placement`);
    for (const p of t.placements) assert.ok(tax.domain(p.domain), `${t.id} placed in known domain ${p.domain}`);
    assert.ok(t.id.startsWith(`${tax.domain(t.placements[0].domain)!.prefix}-`), `${t.id} prefix matches its home domain`);
  }
});

test("domains are derived from placements; a topic can sit in two domains", () => {
  assert.deepEqual(tax.domainsOfTopic("WAT-03"), ["water", "disaster_risk"]);
  assert.ok(tax.topicsOfDomain("disaster_risk").some((t) => t.id === "WAT-03"));
  assert.equal(tax.topicsOfDomain("water")[0].placements[0].domain, "water");
});

test("prompt text lists every topic once with routing hints", () => {
  const text = taxonomyPromptText(tax);
  for (const id of tax.topicIds) assert.equal(text.split("\n").filter((l) => l.startsWith(`- ${id} `)).length, 1, id);
  assert.match(text, /WAT-03 Flood and coastal protection: .*\[for flood warning systems use DRM-03/);
});

test("a domain's question names the domain and every topic placed in it", () => {
  const q = domainQuestion(tax.domain("water")!, tax);
  assert.match(q, /^What does the document say about Water/);
  for (const t of tax.topicsOfDomain("water")) assert.ok(q.includes(`${t.id} ${t.label}`), t.id);
});

test("a retired domain drops out of a topic's domains", () => {
  const without = makeTaxonomy("x", tax.domains.filter((d) => d.id !== "disaster_risk"), tax.topics);
  assert.deepEqual(without.domainsOfTopic("WAT-03"), ["water"]);
});

test("version string adds the revision", () => {
  assert.equal(versionString("0.1.0-draft", 0), "0.1.0-draft");
  assert.equal(versionString("0.1.0-draft", 3), "0.1.0-draft+r3");
});
