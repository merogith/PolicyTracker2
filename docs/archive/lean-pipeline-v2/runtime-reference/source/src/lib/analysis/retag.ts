import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { models } from "../openai";
import { loadTaxonomy } from "../taxonomy";
import { callStructured } from "./call";
import { retagInstructions, retagUserText } from "./prompt";
import { retagSchema } from "./schemas";

type Json = Record<string, unknown>;

export interface RetagOutcome {
  status: "done" | "skipped";
  findings?: number;
  costUsd?: number;
}

/**
 * Re-label a document answer's findings with the current taxonomy, without reading the pages again.
 * Findings, stages, figures and quotes stay as they are; only topic_ids and unmapped_concepts change.
 */
export async function retagResult(resultId: string): Promise<RetagOutcome> {
  const result = await db.analysisResult.findUnique({ where: { id: resultId } });
  const tax = await loadTaxonomy();
  if (!result || result.scope !== "document" || result.status !== "done" || result.taxonomyVersion === tax.version) return { status: "skipped" };
  const output = result.output as Json;
  const findings = (output.findings as Json[]) ?? [];

  if (findings.length === 0) {
    await db.analysisResult.update({ where: { id: result.id }, data: { taxonomyVersion: tax.version } });
    return { status: "done", findings: 0, costUsd: 0 };
  }

  const call = await callStructured({
    model: models.synthesis,
    instructions: retagInstructions(tax),
    text: retagUserText(
      findings.map((f, index) => ({ index, text: f.text as string, quotes: ((f.citations as Json[]) ?? []).map((c) => c.quote as string) })),
    ),
    schema: retagSchema(tax.topicIds),
    schemaName: "retag",
  });

  const valid = new Set(tax.topicIds);
  const byIndex = new Map(call.output.findings.map((f) => [f.index, f]));
  const updated = findings.map((f, i) => {
    const tags = byIndex.get(i);
    if (tags) return { ...f, topic_ids: tags.topic_ids, unmapped_concepts: tags.unmapped_concepts };
    // Not returned: keep the old tags that still exist.
    return { ...f, topic_ids: ((f.topic_ids as string[]) ?? []).filter((t) => valid.has(t)) };
  });

  await db.analysisResult.update({
    where: { id: result.id },
    data: {
      output: { ...output, findings: updated } as Prisma.InputJsonValue,
      taxonomyVersion: tax.version,
      costUsd: { increment: call.costUsd },
      sources: { ...((result.sources as Json | null) ?? {}), lastRetag: { version: tax.version, costUsd: call.costUsd, at: new Date().toISOString() } },
    },
  });
  return { status: "done", findings: findings.length, costUsd: call.costUsd };
}
