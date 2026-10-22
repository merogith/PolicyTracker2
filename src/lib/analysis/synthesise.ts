import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { models, openai } from "../openai";
import { isDemoId, isDemoSource } from "../ai-mode";
import { loadTaxonomy } from "../taxonomy";
import { callStructured } from "./call";
import { PROMPT_VERSION, synthesisInstructions, synthesisUserText } from "./prompt";
import { citationLists, schemaFor, schemaName } from "./schemas";

type Json = Record<string, unknown>;

/** The findings of a document answer as the synthesis sees them, each with a ref. */
function findingsFor(documentId: string, output: Json) {
  return ((output.findings as Json[]) ?? []).map((item, i) => {
    // Quotes and topic tags stay with the document answer; code carries them over by ref.
    const { citations: _c, topic_ids: _t, unmapped_concepts: _u, ...rest } = item;
    void _c;
    void _t;
    void _u;
    return { ref: `${documentId}#findings.${i}`, ...rest };
  });
}

/** "KAZ-NDC1#findings.2" -> document KAZ-NDC1, citation path "findings.2". */
export function parseRef(ref: string) {
  const m = ref.match(/^([A-Z]{3}-[A-Z]+\d+)#(findings\.\d+)$/);
  if (!m) return null;
  return { documentId: m[1], path: m[2] };
}

export interface SynthesisOutcome {
  status: "done" | "skipped" | "removed";
  citations?: number;
  unresolvedRefs?: number;
  reusedDocument?: boolean;
}

/** Summarise one domain across a country's documents, from their document answers. */
export async function synthesiseCountryDomain(countryId: string, domainId: string): Promise<SynthesisOutcome> {
  const country = await db.country.findUnique({ where: { id: countryId } });
  const tax = await loadTaxonomy();
  const domain = tax.domain(domainId);
  if (!country || country.status !== "active" || !domain || !domain.enabled) return { status: "skipped" };
  const slot = `country:${country.id}`;

  const documents = await db.document.findMany({
    where: { countryId, status: { notIn: ["deleting", "failed"] } },
    orderBy: [{ editionDate: "asc" }, { id: "asc" }],
    include: {
      results: {
        where: { domainId: domain.id, domainVersion: domain.version, status: "done" },
        include: { citations: true },
      },
    },
  });
  const withResults = documents.filter((d) => d.results.length > 0);
  if (withResults.length === 0) {
    // Nothing to summarise (e.g. the last document was deleted).
    await db.analysisResult.deleteMany({ where: { domainId: domain.id, slot } });
    return { status: "removed" };
  }

  // A single document already is the country's answer. Preserve its findings and quotes
  // in the country shape so every existing overview, topic view and export keeps working.
  if (documents.length === 1) {
    const document = withResults[0];
    const source = document.results[0];
    const output = source.output as Json;
    const findings = findingsFor(document.id, output).map(({ ref, ...finding }) => ({
      ...finding,
      citations: [{ ref }],
    }));
    const itemRefs = Object.fromEntries(findings.map((_, i) => [
      `findings.${i}`, [{ resultId: source.id, path: `findings.${i}` }],
    ]));
    await db.$transaction(async (tx) => {
      const data = {
        status: "done",
        output: {
          findings,
          not_found: Boolean(output.not_found),
          note: output.note ?? null,
          citations: findings.map((_, i) => ({ ref: `${document.id}#findings.${i}` })),
          by_document: [{
            document_id: document.id,
            summary: String(output.note ?? ((output.findings as Json[]) ?? []).map((f) => f.summary ?? f.text).join(" ")),
          }],
          changes_between_editions: [],
        } as Prisma.InputJsonValue,
        model: null,
        promptVersion: source.promptVersion,
        taxonomyVersion: source.taxonomyVersion,
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        fileSearchCalls: 0,
        costUsd: 0,
        sources: {
          mode: isDemoSource(source.sources) ? "demo" : "live",
          method: "single_document",
          documents: [{ documentId: document.id, resultId: source.id }],
          documentsWithoutAnswer: [],
          unresolvedRefs: [],
          itemRefs,
        },
        error: null,
        finishedAt: new Date(),
      };
      const result = await tx.analysisResult.upsert({
        where: { domainId_domainVersion_slot: { domainId: domain.id, domainVersion: domain.version, slot } },
        create: { domainId: domain.id, domainVersion: domain.version, slot, scope: "country", countryId, ...data },
        update: data,
      });
      await tx.citation.deleteMany({ where: { resultId: result.id } });
      await tx.citation.createMany({
        data: source.citations.map((c) => ({
          resultId: result.id, documentId: c.documentId, page: c.page, citedPage: c.citedPage,
          quote: c.quote, verified: c.verified, itemPath: c.itemPath, position: c.position,
        })),
      });
    });
    return { status: "done", citations: source.citations.length, unresolvedRefs: 0, reusedDocument: true };
  }

  if (!openai().fake && (isDemoId(country.vectorStoreId) || withResults.some((d) => isDemoSource(d.results[0].sources)))) {
    throw new Error("Re-analyze the demo document answers before creating a live country summary.");
  }

  const input = {
    domain: { label: domain.label, definition: domain.definition },
    documents: withResults.map((d) => {
      const output = d.results[0].output as Json;
      return {
        document_id: d.id,
        title: d.title,
        kind: d.kind,
        edition_date: d.editionDate,
        not_found: Boolean(output.not_found),
        note: output.note ?? null,
        findings: findingsFor(d.id, output),
      };
    }),
    documents_without_answer: documents.filter((d) => d.results.length === 0).map((d) => d.id),
  };

  const model = models.synthesis;
  const result = await db.analysisResult.upsert({
    where: { domainId_domainVersion_slot: { domainId: domain.id, domainVersion: domain.version, slot } },
    create: { domainId: domain.id, domainVersion: domain.version, slot, scope: "country", countryId, status: "running", model },
    update: { status: "running", error: null, model },
  });

  try {
    const call = await callStructured({
      model,
      instructions: synthesisInstructions(),
      text: synthesisUserText(domain, tax, JSON.stringify(input, null, 1)),
      schema: schemaFor("country", tax.topicIds),
      schemaName: schemaName("country"),
      diagnosticContext: `${country.iso3}:${domain.id}:synthesis`,
    });

    // Copy the quotes of the document findings each country finding names.
    const byDocPath = new Map<string, (typeof withResults)[number]["results"][number]["citations"]>();
    for (const d of withResults) {
      for (const c of d.results[0].citations) {
        const k = `${d.id}|${c.itemPath}`;
        byDocPath.set(k, [...(byDocPath.get(k) ?? []), c]);
      }
    }

    const rows: Prisma.CitationCreateManyInput[] = [];
    const unresolved: string[] = [];
    // The document findings each country finding rests on; their topic tags give the country finding's topics.
    const itemRefs: Record<string, Array<{ resultId: string; path: string }>> = {};
    for (const list of citationLists<{ ref: string }>(call.output)) {
      let position = 0;
      const refs: Array<{ resultId: string; path: string }> = [];
      for (const { ref } of list.citations) {
        const parsed = parseRef(ref);
        const doc = parsed ? withResults.find((d) => d.id === parsed.documentId) : undefined;
        const source = parsed ? byDocPath.get(`${parsed.documentId}|${parsed.path}`) : undefined;
        if (!parsed || !doc || !source) {
          unresolved.push(ref);
          continue;
        }
        refs.push({ resultId: doc.results[0].id, path: parsed.path });
        for (const c of [...source].sort((a, b) => a.position - b.position)) {
          rows.push({
            resultId: result.id,
            documentId: c.documentId,
            page: c.page,
            citedPage: c.citedPage,
            quote: c.quote,
            verified: c.verified,
            itemPath: list.path,
            position: position++,
          });
        }
      }
      if (list.path) itemRefs[list.path] = refs;
    }

    await db.$transaction([
      db.citation.deleteMany({ where: { resultId: result.id } }),
      db.citation.createMany({ data: rows }),
      db.analysisResult.update({
        where: { id: result.id },
        data: {
          status: "done",
          output: call.output as Prisma.InputJsonValue,
          promptVersion: PROMPT_VERSION,
          taxonomyVersion: tax.version,
          inputTokens: call.usage.inputTokens,
          cachedTokens: call.usage.cachedTokens,
          outputTokens: call.usage.outputTokens,
          reasoningTokens: call.usage.reasoningTokens,
          fileSearchCalls: 0,
          costUsd: call.costUsd,
          sources: {
            mode: openai().fake ? "demo" : "live",
            responseId: call.responseId,
            documents: withResults.map((d) => ({ documentId: d.id, resultId: d.results[0].id })),
            documentsWithoutAnswer: input.documents_without_answer,
            unresolvedRefs: unresolved,
            itemRefs,
          },
          finishedAt: new Date(),
        },
      }),
    ]);
    return { status: "done", citations: rows.length, unresolvedRefs: unresolved.length };
  } catch (err) {
    await db.analysisResult.update({
      where: { id: result.id },
      data: { status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() },
    });
    throw err;
  }
}
