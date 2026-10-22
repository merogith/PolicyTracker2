import { retagResult } from "@/lib/analysis/retag";
import { analyseDocumentDomain } from "@/lib/analysis/run";
import { synthesiseCountryDomain } from "@/lib/analysis/synthesise";
import { db } from "@/lib/db";
import { deleteCountryEverywhere, deleteDocumentEverywhere } from "@/lib/deletion";
import type { JobType } from "@/lib/domain";
import { ingestDocument } from "@/lib/ingest";
import { Defer, type JobPayload } from "@/lib/jobs";

export interface HandlerResult {
  summary?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

type Handler<T extends JobType> = (payload: JobPayload[T]) => Promise<HandlerResult | void>;

export const handlers: { [T in JobType]: Handler<T> } = {
  async ingest_document({ documentId }) {
    await ingestDocument(documentId);
    const pages = await db.page.count({ where: { documentId } });
    return { summary: `${pages} pages` };
  },

  async analyse_document_domain({ documentId, domainId }) {
    const out = await analyseDocumentDomain(documentId, domainId);
    if (out.status === "skipped") return { summary: "skipped (document or domain gone)" };
    const result = await db.analysisResult.findFirst({
      where: { documentId, domainId, status: "done" },
      orderBy: { domainVersion: "desc" },
    });
    return {
      summary: `${out.verified}/${out.citations} citations verified`,
      inputTokens: result?.inputTokens,
      outputTokens: result?.outputTokens,
      costUsd: out.costUsd,
    };
  },

  async synthesise_country_domain({ countryId, domainId }) {
    // Build the overview only after all document analyses in this country finish.
    const pendingDocs = await db.document.count({
      where: { countryId, status: { in: ["uploaded", "extracting", "indexing"] } },
    });
    const pendingJobs = await db.job.count({
      where: { countryId, type: { in: ["ingest_document", "analyse_document_domain"] }, status: { in: ["queued", "running"] } },
    });
    if (pendingDocs > 0 || pendingJobs > 0) {
      throw new Defer(10, `waiting for ${pendingDocs} document(s) to be indexed and ${pendingJobs} analysis job(s)`);
    }
    const out = await synthesiseCountryDomain(countryId, domainId);
    const result = await db.analysisResult.findFirst({
      where: { countryId, domainId, scope: "country", status: "done" },
      orderBy: { domainVersion: "desc" },
    });
    if (out.status !== "done") return { summary: out.status };
    return {
      summary: `${out.reusedDocument ? "single-document overview (no LLM call); " : ""}${out.citations} citations copied${out.unresolvedRefs ? `, ${out.unresolvedRefs} unknown refs` : ""}`,
      inputTokens: result?.inputTokens,
      outputTokens: result?.outputTokens,
      costUsd: result?.costUsd,
    };
  },

  async retag_result({ resultId }) {
    const out = await retagResult(resultId);
    if (out.status === "skipped") return { summary: "skipped (already current)" };
    return { summary: `${out.findings} findings re-tagged`, costUsd: out.costUsd };
  },

  async delete_document({ documentId }) {
    await deleteDocumentEverywhere(documentId);
  },

  async delete_country({ countryId }) {
    await deleteCountryEverywhere(countryId);
  },
};
