import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { models } from "../openai";
import { loadTaxonomy } from "../taxonomy";
import { callStructured } from "./call";
import { documentInstructions, documentUserText, PROMPT_VERSION } from "./prompt";
import { citationLists, schemaFor, schemaName, type DocCitation } from "./schemas";
import { verifyQuote, type PageText } from "./verify";

export interface AnalyseOutcome {
  status: "done" | "skipped";
  citations?: number;
  verified?: number;
  costUsd?: number;
}

/** Ask one domain's question of one document, verify the quotes and store the answer. */
export async function analyseDocumentDomain(documentId: string, domainId: string): Promise<AnalyseOutcome> {
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { country: true } });
  const tax = await loadTaxonomy();
  const domain = tax.domain(domainId);
  if (!doc || doc.status === "deleting" || !domain || !domain.enabled) return { status: "skipped" };
  if (!doc.country.vectorStoreId) throw new Error(`Country ${doc.country.iso3} has no vector store`);

  const slot = `doc:${doc.id}`;
  const model = models.analysis;
  const result = await db.analysisResult.upsert({
    where: { domainId_domainVersion_slot: { domainId: domain.id, domainVersion: domain.version, slot } },
    create: { domainId: domain.id, domainVersion: domain.version, slot, scope: "document", documentId: doc.id, countryId: doc.countryId, status: "running", model },
    update: { status: "running", error: null, model },
  });

  try {
    const call = await callStructured({
      model,
      instructions: documentInstructions(tax),
      text: documentUserText(doc, domain, tax),
      schema: schemaFor("document", tax.topicIds),
      schemaName: schemaName("document"),
      fileSearch: {
        vectorStoreId: doc.country.vectorStoreId,
        filters: { type: "eq" as const, key: "document_id", value: doc.id },
        maxNumResults: domain.maxResults,
      },
    });

    // Verify every quote against the stored page text.
    const pages = new Map<number, PageText>((await db.page.findMany({ where: { documentId: doc.id } })).map((p) => [p.page, p]));
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
          fileSearchCalls: call.fileSearchCalls,
          costUsd: call.costUsd,
          sources: { pagesRead: retrievedPages, queries: call.queries },
          finishedAt: new Date(),
        },
      }),
    ]);
    return { status: "done", citations: rows.length, verified: rows.filter((r) => r.verified).length, costUsd: call.costUsd };
  } catch (err) {
    const spent = (err as { usage?: { inputTokens: number; outputTokens: number }; costUsd?: number }) ?? {};
    await db.analysisResult.update({
      where: { id: result.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        inputTokens: spent.usage?.inputTokens ?? 0,
        outputTokens: spent.usage?.outputTokens ?? 0,
        costUsd: spent.costUsd ?? 0,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
