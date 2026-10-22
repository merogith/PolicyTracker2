import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { models, openai } from "../openai";
import { isDemoId } from "../ai-mode";
import { loadTaxonomy } from "../taxonomy";
import { callStructured, type CallDiagnostics } from "./call";
import { PROMPT_VERSION } from "./prompt";
import { documentRequest } from "./request";
import { citationLists, type DocCitation } from "./schemas";
import { verifyQuote } from "./verify";
import { LABEL_VERSION } from "../labels";
import { classifyFindings } from "./classify";
import { repairEvidence } from "./repair-evidence";

export interface AnalyseOutcome {
  status: "done" | "skipped";
  citations?: number;
  verified?: number;
  costUsd?: number;
  unclassified?: number;
}

/** Ask one domain's question of one document, verify the quotes and store the answer. */
export async function analyseDocumentDomain(documentId: string, domainId: string): Promise<AnalyseOutcome> {
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { country: true } });
  const tax = await loadTaxonomy();
  const domain = tax.domain(domainId);
  if (!doc || doc.status === "deleting" || !domain || !domain.enabled) return { status: "skipped" };
  if (!doc.country.vectorStoreId) throw new Error(`Country ${doc.country.iso3} has no vector store`);
  if (!openai().fake && (isDemoId(doc.country.vectorStoreId) || await db.page.count({ where: { documentId, openaiFileId: { contains: "_fake_" } } }))) {
    throw new Error("This document still has a demo index. Re-run the document to build its real API index first.");
  }

  const slot = `doc:${doc.id}`;
  const model = models.analysis;
  const result = await db.analysisResult.upsert({
    where: { domainId_domainVersion_slot: { domainId: domain.id, domainVersion: domain.version, slot } },
    create: { domainId: domain.id, domainVersion: domain.version, slot, scope: "document", documentId: doc.id, countryId: doc.countryId, status: "running", model },
    update: { status: "running", error: null, model },
  });

  let evidenceSaved = false;
  try {
    const call = await callStructured(documentRequest(doc, domain, tax, model));

    // Verify every quote against the stored page text.
    const pages = new Map((await db.page.findMany({ where: { documentId: doc.id } })).map((p) => [p.page, p]));
    const repaired = await repairEvidence(call.output.findings, pages, model, `${doc.id}:${domain.id}`);
    const usage = { ...call.usage };
    let totalCost = call.costUsd;
    for (const repair of repaired.diagnostics) {
      totalCost += repair.costUsd ?? 0;
      if (repair.usage) for (const key of Object.keys(usage) as Array<keyof typeof usage>) usage[key] += repair.usage[key];
    }
    const rows: Prisma.CitationCreateManyInput[] = [];
    for (const list of citationLists<DocCitation>(call.output)) {
      list.citations.forEach((c, position) => {
        const v = verifyQuote(c.quote, c.page, pages);
        rows.push({
          resultId: result.id,
          documentId: doc.id,
          page: v.page,
          citedPage: c.page,
          quote: c.quote,
          verified: v.verified,
          itemPath: list.path,
          position,
        });
      });
    }

    const retrievedPages = [
      ...new Set(
        call.retrieved
          .map((r) => Number(r.attributes.page ?? r.filename?.match(/-p(\d+)\.txt$/)?.[1]))
          .filter((n) => Number.isFinite(n)),
      ),
    ].sort((a, b) => a - b);

    const sources = {
      mode: openai().fake ? "demo" : "live",
      responseId: call.responseId,
      searchScope: "entire_document",
      totalPages: pages.size,
      indexedPages: [...pages.values()].filter((p) => p.disposition === "extracted" && p.openaiFileId).length,
      passagesPerSearch: domain.maxResults,
      pagesRead: retrievedPages,
      queries: call.queries,
      diagnosticFiles: [call.diagnosticFile, ...repaired.diagnostics.map(c => c.diagnosticFile)].filter((p): p is string => Boolean(p)),
      evidenceErrors: repaired.unresolved,
    };
    // Commit extraction before any classification request. A label failure must
    // never discard evidence, including when a worker is interrupted mid-pass.
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
          inputTokens: usage.inputTokens,
          cachedTokens: usage.cachedTokens,
          outputTokens: usage.outputTokens,
          reasoningTokens: usage.reasoningTokens,
          fileSearchCalls: call.fileSearchCalls,
          costUsd: totalCost,
          sources: { ...sources, labeling: { status: "pending", total: call.output.findings.length, classified: 0 } },
          finishedAt: new Date(),
        },
      }),
    ]);
    evidenceSaved = true;
    const labels = await classifyFindings(call.output.findings.map((f, i) => {
      const citations = rows.filter(c => c.itemPath === `findings.${i}`);
      return { id: `findings.${i}`, text: f.text, quotes: citations.length && citations.every(c => c.verified) ? citations.map(c => c.quote) : [] };
    }), models.synthesis, `${doc.id}:${domain.id}`);
    for (const key of Object.keys(usage) as Array<keyof typeof usage>) usage[key] += labels.usage[key];
    totalCost += labels.costUsd;
    const unclassified = call.output.findings.length - labels.classifications.size;
    await db.analysisResult.update({
      where: { id: result.id },
      data: {
        output: { ...call.output, findings: call.output.findings.map((f, i) => {
          const classification = labels.classifications.get(`findings.${i}`);
          return classification ? { ...f, classification, classification_version: LABEL_VERSION }
            : { ...f, classification_error: labels.errors[`findings.${i}`] ?? "Classification pending" };
        }) } as Prisma.InputJsonValue,
        inputTokens: usage.inputTokens, cachedTokens: usage.cachedTokens, outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens, costUsd: totalCost,
        sources: { ...sources, diagnosticFiles: [...sources.diagnosticFiles, ...labels.diagnosticFiles],
          labeling: { status: unclassified ? "partial" : "complete", total: call.output.findings.length,
            classified: labels.classifications.size, errors: labels.errors, model: models.synthesis } },
        finishedAt: new Date(),
      },
    });
    return { status: "done", citations: rows.length, verified: rows.filter((r) => r.verified).length, costUsd: totalCost, unclassified };
  } catch (err) {
    const spent = (err as CallDiagnostics) ?? {};
    if (evidenceSaved) {
      // Keep extracted findings visible; an interrupted/failed enrichment is explicit.
      const saved = await db.analysisResult.findUniqueOrThrow({ where: { id: result.id } });
      await db.analysisResult.update({ where: { id: result.id }, data: {
        status: "done", sources: { ...(saved.sources as Prisma.JsonObject), labeling: { status: "partial", error: String(err) } },
      } });
      throw err;
    }
    await db.analysisResult.update({
      where: { id: result.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        inputTokens: spent.usage?.inputTokens ?? 0,
        outputTokens: spent.usage?.outputTokens ?? 0,
        costUsd: spent.costUsd ?? 0,
        fileSearchCalls: spent.fileSearchCalls ?? 0,
        cachedTokens: spent.usage?.cachedTokens ?? 0,
        reasoningTokens: spent.usage?.reasoningTokens ?? 0,
        promptVersion: PROMPT_VERSION,
        sources: { mode: openai().fake ? "demo" : "live", diagnosticFile: spent.diagnosticFile ?? null,
          queries: spent.queries ?? [], retrieved: (spent.retrieved ?? []).map(r => ({ ...r })) } as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
