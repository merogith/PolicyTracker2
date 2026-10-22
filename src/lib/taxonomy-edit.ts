// Editing the taxonomy. Every change bumps the taxonomy revision. A domain whose question changes
// (its label, definition, or the topics placed in it) gets a new version and is asked again of every
// document; every other stored answer is only re-tagged with the new taxonomy (a cheap pass that does
// not read the pages). IDs are never reused (fresh-start/GUIDE.md rule 22): retired IDs stay retired,
// and moving a topic to another home domain gives it a new ID that lists the old one in legacyIds.
import type { Prisma } from "@/generated/prisma/client";
import { checkCap, estimateDocumentDomain, estimateRetag, estimateSynthesis } from "./cost";
import { db } from "./db";
import { DOMAIN_ID_PATTERN, PREFIX_PATTERN } from "./domain";
import { UserError } from "./errors";
import { enqueue } from "./jobs";
import { loadTaxonomy, type DomainGroup, type Placement, type Routing } from "./taxonomy";

export interface ChangePlan {
  /** Domains asked again of every document (their question changed or they are new). */
  rerunDomains: string[];
  documentRuns: number;
  summaryRuns: number;
  /** Stored document answers re-labelled with the new taxonomy. */
  retagAnswers: number;
  estimateUsd: number;
  overCap: string | null;
}

async function plan(rerunDomains: string[], retag: boolean): Promise<ChangePlan & { retagIds: string[] }> {
  const docs = await db.document.findMany({ where: { status: { in: ["analysing", "analysed", "partial"] }, country: { status: "active" } }, select: { id: true, countryId: true } });
  const countries = new Map<string, number>();
  for (const d of docs) countries.set(d.countryId, (countries.get(d.countryId) ?? 0) + 1);
  const domains = await db.domain.findMany({ where: { retiredAt: null }, select: { id: true, version: true } });
  const version = new Map(domains.map((d) => [d.id, d.version]));
  const answers = retag
    ? await db.analysisResult.findMany({
        where: { scope: "document", status: "done", domainId: { notIn: rerunDomains }, document: { status: { in: ["analysing", "analysed", "partial"] } } },
        select: { id: true, domainId: true, domainVersion: true },
      })
    : [];
  // Only answers for the current version of a domain are worth re-tagging.
  const retagIds = answers.filter((a) => version.get(a.domainId) === a.domainVersion).map((a) => a.id);
  const documentRuns = rerunDomains.length * docs.length;
  const summaryRuns = rerunDomains.length * countries.size;
  const estimateUsd =
    documentRuns * estimateDocumentDomain() +
    [...countries.values()].reduce((s, n) => s + rerunDomains.length * estimateSynthesis(n), 0) +
    retagIds.length * estimateRetag();
  return { rerunDomains, documentRuns, summaryRuns, retagAnswers: retagIds.length, estimateUsd, overCap: checkCap(estimateUsd), retagIds };
}

async function execute(p: Awaited<ReturnType<typeof plan>>) {
  const docs = await db.document.findMany({ where: { status: { in: ["analysing", "analysed", "partial"] }, country: { status: "active" } }, select: { id: true, countryId: true, status: true } });
  const countries = [...new Set(docs.map((d) => d.countryId))];
  await db.$transaction(async (tx) => {
    for (const domainId of p.rerunDomains) {
      await tx.job.updateMany({ where: { domainId, status: "queued" }, data: { status: "cancelled", finishedAt: new Date(), error: "domain changed" } });
      for (const d of docs) {
        await enqueue("analyse_document_domain", { documentId: d.id, domainId }, { countryId: d.countryId, tx });
        if (d.status === "analysed" || d.status === "partial") await tx.document.update({ where: { id: d.id }, data: { status: "analysing" } });
      }
      for (const c of countries) await enqueue("synthesise_country_domain", { countryId: c, domainId }, { runAfter: new Date(Date.now() + 3000), tx });
    }
    for (const resultId of p.retagIds) {
      const result = await tx.analysisResult.findUniqueOrThrow({ where: { id: resultId }, select: { countryId: true, documentId: true, domainId: true } });
      await enqueue("retag_result", { resultId }, { tx, countryId: result.countryId, documentId: result.documentId ?? undefined, domainId: result.domainId });
    }
  });
}

/** Typed shapes stored in Json columns. */
function json(v: unknown) {
  return v as Prisma.InputJsonValue;
}

async function bumpRevision(tx: Prisma.TransactionClient) {
  await tx.taxonomyState.update({ where: { id: "current" }, data: { revision: { increment: 1 } } });
}

function publicPlan(p: Awaited<ReturnType<typeof plan>>): ChangePlan {
  const { retagIds: _ids, ...rest } = p;
  void _ids;
  return rest;
}

/**
 * Save a change and queue its work. Changes that affect tagging bump the taxonomy revision, which is
 * what makes stored answers out of date; display and retrieval settings do not.
 */
async function commit(preview: boolean, p: Awaited<ReturnType<typeof plan>>, write: (tx: Prisma.TransactionClient) => Promise<void>, retag = true) {
  if (preview) return publicPlan(p);
  if (p.overCap) throw new UserError(`${p.overCap} Raise MAX_USD_PER_RUN or make a smaller change.`, 402);
  await db.$transaction(async (tx) => {
    await write(tx);
    if (retag) await bumpRevision(tx);
  });
  // Plan again after the write: new domain versions and the new taxonomy revision now apply.
  const after = await plan(p.rerunDomains, retag);
  await execute(after);
  return publicPlan(after);
}

const NOTHING: ChangePlan = { rerunDomains: [], documentRuns: 0, summaryRuns: 0, retagAnswers: 0, estimateUsd: 0, overCap: null };

// ---------- validation helpers ----------

function text(v: unknown, field: string, min = 1) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min) throw new UserError(min > 1 ? `Write the ${field} in full` : `${field} is required`);
  return s;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

function groupsOf(v: unknown): DomainGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((g) => ({ id: String((g as DomainGroup).id ?? "").trim(), label: String((g as DomainGroup).label ?? "").trim() }))
    .filter((g) => g.id && g.label)
    .map((g) => ({ ...g, id: g.id.toLowerCase().replace(/[^a-z0-9]+/g, "_") }));
}

function routingOf(v: unknown): Routing[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => ({ when: String((r as Routing).when ?? "").trim(), use: String((r as Routing).use ?? "").trim() })).filter((r) => r.when && r.use);
}

async function placementsOf(v: unknown): Promise<Placement[]> {
  if (!Array.isArray(v) || v.length === 0) throw new UserError("A topic needs a home domain");
  const tax = await loadTaxonomy();
  const out: Placement[] = [];
  for (const raw of v) {
    const p = { domain: String((raw as Placement).domain ?? ""), group: String((raw as Placement).group ?? "") };
    const d = tax.domain(p.domain);
    if (!d) throw new UserError(`No active domain ${p.domain}`);
    if (!d.groups.some((g) => g.id === p.group)) throw new UserError(`Domain ${d.label} has no group ${p.group}`);
    if (out.some((x) => x.domain === p.domain)) throw new UserError(`${d.label} is listed twice`);
    out.push(p);
  }
  return out;
}

async function nextTopicId(prefix: string) {
  const all = await db.topic.findMany({ select: { id: true, legacyIds: true } });
  const ids = all.flatMap((t) => [t.id, ...((t.legacyIds as string[]) ?? [])]);
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const max = ids.reduce((m, id) => Math.max(m, Number(id.match(re)?.[1] ?? 0)), 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}

// ---------- domains ----------

export interface DomainInput {
  id?: string;
  prefix?: string;
  label?: string;
  definition?: string;
  groups?: DomainGroup[];
  searchHints?: string[];
  maxResults?: number;
  enabled?: boolean;
}

export async function createDomain(input: DomainInput, preview = false) {
  const id = String(input.id ?? "").trim();
  const prefix = String(input.prefix ?? "").trim().toUpperCase();
  if (!DOMAIN_ID_PATTERN.test(id)) throw new UserError("ID must use lowercase letters, digits and underscores, e.g. cryosphere");
  if (!PREFIX_PATTERN.test(prefix)) throw new UserError("Prefix must be 2 to 4 capital letters, e.g. CRY");
  if (await db.domain.findUnique({ where: { id } })) throw new UserError(`Domain ID ${id} is taken (IDs are never reused)`, 409);
  if (await db.domain.findUnique({ where: { prefix } })) throw new UserError(`Prefix ${prefix} is taken`, 409);
  const label = text(input.label, "Label");
  const definition = text(input.definition, "definition", 10);
  const groups = groupsOf(input.groups);
  if (groups.length === 0) groups.push({ id: "general", label: "General" });
  const p = await plan([id], true);
  return commit(preview, p, async (tx) => {
    const last = await tx.domain.aggregate({ _max: { order: true } });
    await tx.domain.create({
      data: { id, prefix, label, definition, groups: json(groups), searchHints: json(strings(input.searchHints)), maxResults: input.maxResults ?? 20, order: (last._max.order ?? 0) + 1 },
    });
  });
}

export async function updateDomain(id: string, input: DomainInput, preview = false) {
  const d = await db.domain.findUnique({ where: { id } });
  if (!d || d.retiredAt) throw new UserError(`No domain ${id}`, 404);
  const label = input.label !== undefined ? text(input.label, "Label") : d.label;
  const definition = input.definition !== undefined ? text(input.definition, "definition", 10) : d.definition;
  const groups = input.groups !== undefined ? groupsOf(input.groups) : (d.groups as unknown as DomainGroup[]);
  const searchHints = input.searchHints !== undefined ? strings(input.searchHints) : (d.searchHints as unknown as string[]);
  const maxResults = input.maxResults !== undefined ? Number(input.maxResults) : d.maxResults;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) throw new UserError("Passages per search must be between 1 and 50; all PDF pages remain searchable");
  const enabled = input.enabled ?? d.enabled;
  // Groups still used by a topic placement cannot disappear.
  const used = (await db.topic.findMany({ where: { retiredAt: null } })).flatMap((t) => (t.placements as unknown as Placement[]).filter((p) => p.domain === id).map((p) => p.group));
  const missing = [...new Set(used)].filter((g) => !groups.some((x) => x.id === g));
  if (missing.length) throw new UserError(`Groups still used by topics: ${missing.join(", ")}`);

  const questionChanged = label !== d.label || definition !== d.definition;

  if (!enabled) {
    // Disabling hides the domain and stops its queued work; nothing re-runs.
    if (preview) return NOTHING;
    await db.domain.update({ where: { id }, data: { label, definition, groups: json(groups), searchHints: json(searchHints), maxResults, enabled: false, version: questionChanged ? { increment: 1 } : undefined } });
    await db.job.updateMany({ where: { domainId: id, status: "queued" }, data: { status: "cancelled", finishedAt: new Date(), error: "domain disabled" } });
    return NOTHING;
  }
  if (!questionChanged) {
    // Groups, hints, pages searched, or enabling: no new taxonomy revision. Enabling asks the domain of every document.
    const enabling = !d.enabled;
    const p = await plan(enabling ? [id] : [], false);
    if (preview) return publicPlan(p);
    if (p.overCap) throw new UserError(p.overCap, 402);
    await db.domain.update({ where: { id }, data: { groups: json(groups), searchHints: json(searchHints), maxResults, enabled: true } });
    if (enabling) await execute(p);
    return publicPlan(p);
  }
  // The question changed: a new domain version, asked again everywhere; other answers are re-tagged.
  const p = await plan([id], true);
  return commit(preview, p, async (tx) => {
    await tx.domain.update({ where: { id }, data: { label, definition, groups: json(groups), searchHints: json(searchHints), maxResults, enabled: true, version: { increment: 1 } } });
  });
}

/** Retire a domain with no topics placed in it. Its answers are hidden; its ID is never reused. */
export async function retireDomain(id: string, preview = false) {
  const d = await db.domain.findUnique({ where: { id } });
  if (!d || d.retiredAt) throw new UserError(`No domain ${id}`, 404);
  const placed = (await db.topic.findMany({ where: { retiredAt: null } })).filter((t) => (t.placements as unknown as Placement[]).some((p) => p.domain === id));
  if (placed.length) throw new UserError(`Move or retire its topics first: ${placed.map((t) => t.id).join(", ")}`, 409);
  const p = await plan([], true);
  const out = await commit(preview, p, async (tx) => {
    await tx.domain.update({ where: { id }, data: { retiredAt: new Date(), enabled: false } });
  });
  if (!preview) await db.job.updateMany({ where: { domainId: id, status: "queued" }, data: { status: "cancelled", finishedAt: new Date(), error: "domain retired" } });
  return out;
}

export async function reorderDomains(ids: string[]) {
  await db.$transaction(ids.map((id, i) => db.domain.update({ where: { id }, data: { order: i + 1 } })));
}

export async function rerunDomain(id: string) {
  const d = await db.domain.findUnique({ where: { id } });
  if (!d || d.retiredAt || !d.enabled) throw new UserError(`Domain ${id} is not active`, 404);
  const p = await plan([id], false);
  if (p.overCap) throw new UserError(p.overCap, 402);
  await execute(p);
  return publicPlan(p);
}

// ---------- topics ----------

export interface TopicInput {
  label?: string;
  definition?: string;
  /** First is the home domain. */
  placements?: Placement[];
  routing?: Routing[];
}

/** Domains whose question lists this topic. */
function domainsIn(placements: Placement[]) {
  return placements.map((p) => p.domain);
}

async function bumpDomains(tx: Prisma.TransactionClient, ids: string[]) {
  for (const id of new Set(ids)) await tx.domain.update({ where: { id }, data: { version: { increment: 1 } } });
}

export async function createTopic(input: TopicInput, preview = false) {
  const label = text(input.label, "Label");
  const definition = text(input.definition, "definition", 10);
  const placements = await placementsOf(input.placements);
  const routing = routingOf(input.routing);
  const home = (await db.domain.findUniqueOrThrow({ where: { id: placements[0].domain } })).prefix;
  const id = await nextTopicId(home);
  const affected = domainsIn(placements);
  const p = await plan(affected, true);
  const out = await commit(preview, p, async (tx) => {
    const last = await tx.topic.aggregate({ _max: { order: true } });
    await tx.topic.create({ data: { id, label, definition, placements: json(placements), routing: json(routing), legacyIds: [], splitFrom: [], order: (last._max.order ?? 0) + 1 } });
    await bumpDomains(tx, affected);
  });
  return { ...out, id };
}

export async function updateTopic(id: string, input: TopicInput, preview = false) {
  const t = await db.topic.findUnique({ where: { id } });
  if (!t || t.retiredAt) throw new UserError(`No topic ${id}`, 404);
  const oldPlacements = t.placements as unknown as Placement[];
  const label = input.label !== undefined ? text(input.label, "Label") : t.label;
  const definition = input.definition !== undefined ? text(input.definition, "definition", 10) : t.definition;
  const routing = input.routing !== undefined ? routingOf(input.routing) : (t.routing as unknown as Routing[]);
  const placements = input.placements !== undefined ? await placementsOf(input.placements) : oldPlacements;

  const unchanged =
    label === t.label &&
    definition === t.definition &&
    JSON.stringify(routing) === JSON.stringify(t.routing) &&
    JSON.stringify(placements) === JSON.stringify(oldPlacements);
  if (unchanged) return { ...NOTHING, id };

  const homeMoved = placements[0].domain !== oldPlacements[0].domain;
  const placementChanged = JSON.stringify(domainsIn(placements)) !== JSON.stringify(domainsIn(oldPlacements));
  // A label or placement change alters the question of every domain the topic sits in; a definition or routing change only alters tagging.
  const affected = label !== t.label || placementChanged ? [...new Set([...domainsIn(oldPlacements), ...domainsIn(placements)])] : [];
  const p = await plan(affected, true);

  if (homeMoved) {
    // Moving home changes the prefix: a new ID, the old one retired and listed as its legacy ID.
    const prefix = (await db.domain.findUniqueOrThrow({ where: { id: placements[0].domain } })).prefix;
    const newId = await nextTopicId(prefix);
    const out = await commit(preview, p, async (tx) => {
      const legacy = [...((t.legacyIds as string[]) ?? []), t.id];
      await tx.topic.create({ data: { id: newId, label, definition, placements: json(placements), routing: json(routing), legacyIds: legacy, splitFrom: t.splitFrom ?? [], order: t.order } });
      await tx.topic.update({ where: { id: t.id }, data: { retiredAt: new Date(), replacedBy: [newId] } });
      await bumpDomains(tx, affected);
    });
    return { ...out, id: newId, movedFrom: t.id };
  }
  const out = await commit(preview, p, async (tx) => {
    await tx.topic.update({ where: { id }, data: { label, definition, placements: json(placements), routing: json(routing) } });
    await bumpDomains(tx, affected);
  });
  return { ...out, id };
}

/** Retire a topic. Its ID is never reused; optional successors are recorded. */
export async function retireTopic(id: string, replacedBy: string[] = [], preview = false) {
  const t = await db.topic.findUnique({ where: { id } });
  if (!t || t.retiredAt) throw new UserError(`No topic ${id}`, 404);
  const tax = await loadTaxonomy();
  for (const r of replacedBy) if (!tax.topic(r) || r === id) throw new UserError(`No active topic ${r}`);
  const affected = domainsIn(t.placements as unknown as Placement[]);
  const p = await plan(affected, true);
  return commit(preview, p, async (tx) => {
    await tx.topic.update({ where: { id }, data: { retiredAt: new Date(), replacedBy } });
    for (const r of replacedBy) {
      const successor = await tx.topic.findUniqueOrThrow({ where: { id: r } });
      await tx.topic.update({ where: { id: r }, data: { legacyIds: [...new Set([...((successor.legacyIds as string[]) ?? []), id])] } });
    }
    await bumpDomains(tx, affected);
  });
}
