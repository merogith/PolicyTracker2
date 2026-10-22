// A local stand-in for the OpenAI API, used when OPENAI_FAKE=1 so that the whole pipeline (ingest,
// indexing, analysis, synthesis, deletion) can run without a key. State lives in a JSON file under
// STORAGE_DIR so the web app and the worker see the same files and stores.
//
// Answers are made up from the page text by keyword matching. They are schema-valid and quote the
// pages, so citation checks, cards and the page viewer can be exercised; they say nothing about the
// documents. A few quotes are altered or cited one page off on purpose, to exercise verification.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AttributeFilter,
  Attributes,
  OpenAIGateway,
  RetrievedChunk,
  StoreFile,
  StructuredRequest,
  StructuredResult,
} from "./openai";
import { storageDir } from "./storage";
import { loadTaxonomy, type Topic } from "./taxonomy";

interface FakeFile {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
}
interface FakeStoreFile {
  fileId: string;
  attributes: Attributes;
  status: StoreFile["status"];
}
interface FakeState {
  files: Record<string, FakeFile>;
  stores: Record<string, { name: string; files: FakeStoreFile[] }>;
}

function dir() {
  return path.join(storageDir(), ".openai-fake");
}

function load(): FakeState {
  const p = path.join(dir(), "state.json");
  if (!existsSync(p)) return { files: {}, stores: {} };
  return JSON.parse(readFileSync(p, "utf8")) as FakeState;
}

function save(state: FakeState) {
  mkdirSync(dir(), { recursive: true });
  const p = path.join(dir(), "state.json");
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 1));
  renameSync(tmp, p);
}

function update<T>(fn: (s: FakeState) => T): T {
  const s = load();
  const out = fn(s);
  save(s);
  return out;
}

function id(prefix: string) {
  return `${prefix}_fake_${randomBytes(8).toString("hex")}`;
}

function hash(s: string) {
  return createHash("sha1").update(s).digest().readUInt32BE(0);
}

function matches(filter: AttributeFilter, attrs: Attributes): boolean {
  if ("filters" in filter) {
    return filter.type === "and"
      ? filter.filters.every((f) => matches(f, attrs))
      : filter.filters.some((f) => matches(f, attrs));
  }
  const v = attrs[filter.key];
  switch (filter.type) {
    case "eq":
      return v === filter.value;
    case "ne":
      return v !== filter.value;
    case "gt":
      return v > filter.value;
    case "gte":
      return v >= filter.value;
    case "lt":
      return v < filter.value;
    case "lte":
      return v <= filter.value;
    case "in":
      return filter.value.includes(v as string | number);
    case "nin":
      return !filter.value.includes(v as string | number);
  }
}

const STOP = new Set(
  "the and for with that this from what which does document its their they how far each has have are was were into about other such also than more most some say says".split(" "),
);

function keywords(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w)))];
}

type TopicWords = Array<{ id: string; words: Set<string> }>;

function topicWords(topics: Topic[]): TopicWords {
  return topics.map((t) => ({ id: t.id, words: new Set(keywords(`${t.label} ${t.definition}`)) }));
}

/** Up to two topics sharing at least two words with the sentence; otherwise none, with the sentence's first words as unmapped. */
function tagTopics(sentence: string, topics: TopicWords) {
  const words = keywords(sentence);
  const scored = topics
    .map((t) => ({ id: t.id, score: words.filter((w) => t.words.has(w)).length }))
    .filter((t) => t.score >= 2)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 2);
  return {
    topic_ids: scored.map((t) => t.id),
    unmapped_concepts: scored.length ? [] : [sentence.split(" ").slice(0, 4).join(" ")],
  };
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9«"“(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 400);
}

interface Hit {
  page: number;
  sentence: string;
  score: number;
}

function findHits(pages: Array<{ page: number; text: string }>, words: string[], limit: number): Hit[] {
  const hits: Hit[] = [];
  for (const p of pages) {
    for (const s of sentences(p.text)) {
      const low = s.toLowerCase();
      const score = words.filter((w) => low.includes(w)).length;
      if (score > 0) hits.push({ page: p.page, sentence: s, score });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.page - b.page);
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.sentence) ? false : (seen.add(h.sentence), true))).slice(0, limit);
}

/** Cite the hit, sometimes wrongly, so that verification has something to catch. */
function cite(h: Hit, pageCount: number) {
  const k = hash(h.sentence);
  if (k % 29 === 0) return { page: h.page, quote: h.sentence.replace(/\b(\w{4,})\b/, "$1 notably") };
  if (k % 31 === 0 && h.page < pageCount) return { page: h.page + 1, quote: h.sentence };
  return { page: h.page, quote: h.sentence };
}

function kindOf(s: string) {
  const l = s.toLowerCase();
  if (/\b(was|were|has been|have been) (adopted|approved|established|installed|completed|launched)\b/.test(l)) return "delivered";
  if (/\b(is being|are being|under way|underway|ongoing|currently)\b/.test(l)) return "underway";
  if (/\b(will|shall|plans? to|is planned|are planned|to be)\b/.test(l)) return "planned_action";
  if (/\b(target|aims?|goal|commit|priority|reduce .* by)\b/.test(l)) return "commitment";
  if (/\b(risk|vulnerab|loss|damage|decline|threat|increase in temperature|drought|flood)/.test(l)) return "concern";
  return "other";
}

const NUMBER = /(\d{1,3}(?:[ ,]\d{3})+|\d+(?:[.,]\d+)?)\s?(%|percent|per cent|USD|million|billion|GW|MW|Mt|tons?|ha|km|°C)?/i;

function numberOf(s: string) {
  const m = s.match(NUMBER);
  if (!m) return null;
  const stated = m[0].trim();
  const digits = m[1].replace(/[ ,](?=\d{3}\b)/g, "");
  const value = /^\d+(\.\d+)?$/.test(digits) ? digits : null;
  const year = s.match(/\b(19|20)\d{2}\b/g);
  return { stated, value, unit: m[2] ?? null, period: year ? year[year.length - 1] : null };
}

function conditionality(s: string) {
  const l = s.toLowerCase();
  if (l.includes("unconditional")) return "unconditional";
  if (l.includes("conditional")) return "conditional";
  return "not_stated";
}

function documentAnswer(hits: Hit[], pageCount: number, topics: TopicWords) {
  const findings = hits.slice(0, 6).map((h) => {
    const n = numberOf(h.sentence);
    const isTarget = /\b(target|reduce|aims?)\b/i.test(h.sentence);
    return {
      title: "Policy statement from the demonstration document",
      summary: h.sentence,
      text: h.sentence,
      kind: n && isTarget ? "commitment" : kindOf(h.sentence),
      figures: n ? [{ label: "Figure stated in this finding", value_as_stated: n.stated, value: n.value, unit: n.unit, period: n.period, conditionality: conditionality(h.sentence) }] : [],
      ...tagTopics(h.sentence, topics),
      citations: [cite(h, pageCount)],
      classification: {
        statement_type: { value: "other", quotes: [cite(h, pageCount).quote] },
        labels: { purpose: [], geographic_scope: [], hazards: [], themes: [], affected_groups: [], policy_instruments: [], risk_component: [], risk_function: [] },
        facts: [], actors: [], priority: null,
      },
    };
  });
  return {
    findings,
    not_found: findings.length === 0,
    note: findings.length === 0 ? "Nothing on this question in the pages searched." : null,
    citations: [],
  };
}

interface SynthesisInput {
  documents: Array<{
    document_id: string;
    not_found: boolean;
    findings: Array<{ ref: string; text: string; kind?: string; figures?: unknown[] }>;
  }>;
}

function countryAnswer(input: SynthesisInput) {
  const docs = input.documents;
  const all = docs.flatMap((d) => d.findings.slice(0, 4).map((f) => ({ ...f, doc: d.document_id })));
  return {
    findings: all.map((f) => ({ title: "Policy statement from the demonstration document", summary: f.text, text: f.text, kind: f.kind ?? "other", figures: f.figures ?? [], citations: [{ ref: f.ref }] })),
    not_found: all.length === 0,
    note: null,
    citations: [],
    by_document: docs.map((d) => ({
      document_id: d.document_id,
      summary: d.not_found ? "Nothing on this question in this document." : `${d.findings.length} finding(s); first: ${(d.findings[0]?.text ?? "").slice(0, 120)}`,
    })),
    changes_between_editions:
      docs.length > 1 ? [{ text: docs.map((d) => `${d.document_id} has ${d.findings.length} finding(s)`).join("; "), document_ids: docs.map((d) => d.document_id) }] : [],
  };
}

export class FakeGateway implements OpenAIGateway {
  readonly fake = true;

  async createVectorStore(name: string) {
    return update((s) => {
      const storeId = id("vs");
      s.stores[storeId] = { name, files: [] };
      return storeId;
    });
  }

  async deleteVectorStore(vectorStoreId: string) {
    update((s) => {
      delete s.stores[vectorStoreId];
    });
  }

  async uploadFile(filename: string, data: Buffer, purpose: string) {
    const fileId = id("file");
    mkdirSync(path.join(dir(), "files"), { recursive: true });
    writeFileSync(path.join(dir(), "files", fileId), data);
    update((s) => {
      s.files[fileId] = { id: fileId, filename, purpose, bytes: data.length };
    });
    return fileId;
  }

  async deleteFile(fileId: string) {
    update((s) => {
      delete s.files[fileId];
    });
  }

  async attachFiles(vectorStoreId: string, files: Array<{ fileId: string; attributes: Attributes }>) {
    update((s) => {
      const store = s.stores[vectorStoreId];
      if (!store) throw new Error(`fake: no vector store ${vectorStoreId}`);
      for (const f of files) {
        if (!s.files[f.fileId]) throw new Error(`fake: no file ${f.fileId}`);
        store.files.push({ fileId: f.fileId, attributes: f.attributes, status: "completed" });
      }
    });
  }

  async listStoreFiles(vectorStoreId: string): Promise<StoreFile[]> {
    const store = load().stores[vectorStoreId];
    if (!store) throw new Error(`fake: no vector store ${vectorStoreId}`);
    return store.files.map((f) => ({ id: f.fileId, status: f.status, error: null }));
  }

  async detachFile(vectorStoreId: string, fileId: string) {
    update((s) => {
      const store = s.stores[vectorStoreId];
      if (store) store.files = store.files.filter((f) => f.fileId !== fileId);
    });
  }

  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult> {
    const [scope] = req.schemaName.split("_");
    const state = load();
    let answer: unknown;
    let retrieved: RetrievedChunk[] = [];
    let readChars = 0;
    const jsonBlock = () => {
      const m = req.text.match(/```json\n([\s\S]*?)\n```/);
      if (!m) throw new Error("fake: input has no JSON block");
      return JSON.parse(m[1]) as unknown;
    };

    if (scope === "labels") {
      const inputs = jsonBlock() as Array<{ id: string }>;
      answer = { items: inputs.map(input => ({ id: input.id, classification: {
        statement_type: { value: "other", quotes: ["Q0"] },
        labels: { purpose: [], geographic_scope: [], hazards: [], themes: [], affected_groups: [], policy_instruments: [], risk_component: [], risk_function: [] },
        facts: [], actors: [], priority: null,
      } })) };
    } else if (scope === "retag") {
      const topics = topicWords((await loadTaxonomy()).topics);
      const findings = jsonBlock() as Array<{ index: number; text: string }>;
      answer = { findings: findings.map((f) => ({ index: f.index, ...tagTopics(f.text, topics) })) };
    } else if (scope === "country") {
      answer = countryAnswer(jsonBlock() as SynthesisInput);
    } else {
      const topics = topicWords((await loadTaxonomy()).topics);
      let pageFiles: FakeStoreFile[] = [];
      if (req.fileSearch) {
        const store = state.stores[req.fileSearch.vectorStoreId];
        if (!store) throw new Error(`fake: no vector store ${req.fileSearch.vectorStoreId}`);
        pageFiles = store.files.filter((f) => matches(req.fileSearch!.filters, f.attributes));
      }
      const pages = pageFiles.map((f) => {
        const text = readFileSync(path.join(dir(), "files", f.fileId), "utf8").replace(/^[^\n]*\n\n/, "");
        return { page: Number(f.attributes.page), text, fileId: f.fileId, attributes: f.attributes };
      });
      const words = keywords(req.text.split("\n").filter((l) => /^(Question|Search hints)/.test(l)).join(" "));
      const ranked = pages
        .map((p) => ({ p, score: words.filter((w) => p.text.toLowerCase().includes(w)).length }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || a.p.page - b.p.page)
        .slice(0, req.fileSearch?.maxNumResults ?? pages.length);
      const read = ranked.map((r) => r.p);
      retrieved = ranked.map((r) => ({ fileId: r.p.fileId, filename: null, score: Math.min(1, r.score / 10), attributes: r.p.attributes }));
      readChars = read.reduce((n, p) => n + p.text.length, 0);
      answer = documentAnswer(findHits(read, words, 8), pages.length, topics);
    }

    const outputText = JSON.stringify(answer);
    return {
      outputText,
      refusal: null,
      incomplete: null,
      usage: {
        inputTokens: Math.ceil((req.instructions.length + req.text.length + readChars) / 4),
        cachedTokens: 0,
        outputTokens: Math.ceil(outputText.length / 4),
        reasoningTokens: 0,
      },
      fileSearchCalls: req.fileSearch ? 1 : 0,
      queries: req.fileSearch ? ["(fake) question and search hints"] : [],
      retrieved,
      responseId: id("resp"),
    };
  }
}
