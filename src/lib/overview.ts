// Data for a country's overview charts. Everything here is a count of what the documents say, shown
// next to what was read; scores live in the separate scoring layer (src/lib/scoring.ts).
import { db } from "./db";
import { loadTaxonomy, type Taxonomy } from "./taxonomy";
import { STAGE_OF } from "./topic-merge";
import { readReport } from "./report-reader";
import { isDemoSource } from "./ai-mode";

type Json = Record<string, unknown>;

export interface CoverageCell {
  documentId: string;
  status: "found" | "not_found" | "pending" | "failed" | "missing";
  items: number;
}

export interface FigureRow {
  /** The domains whose combined summary states this figure (the same finding often answers several). */
  domains: Array<{ id: string; label: string }>;
  finding: string;
  kind: string;
  valueAsStated: string;
  unit: string | null;
  period: string | null;
  conditionality: string;
  documents: string[];
}

export async function currentCountryOverview(countryId: string, taxonomy?: Taxonomy) {
  const tax = taxonomy ?? await loadTaxonomy();
  const domains = tax.domains.filter((d) => d.enabled);
  const [documents, results, jobs] = await Promise.all([
    db.document.findMany({
      where: { countryId, status: { not: "deleting" } },
      orderBy: [{ editionDate: "asc" }, { id: "asc" }],
      include: { pages: { select: { disposition: true } } },
    }),
    db.analysisResult.findMany({
      where: { countryId, domainId: { in: domains.map((d) => d.id) } },
      include: { citations: { select: { verified: true, documentId: true, itemPath: true } } },
    }),
    db.job.findMany({ where: { countryId, status: { in: ["queued", "running"] } }, select: { dedupeKey: true } }),
  ]);
  const pending = new Set(jobs.map((j) => j.dedupeKey));
  const current = results.filter((r) => domains.find((d) => d.id === r.domainId)?.version === r.domainVersion);

  // How many findings each document's answer has per domain.
  const coverage = domains.map((d) => {
    const summary = current.find(r => r.domainId === d.id && r.scope === "country");
    const summaryStatus: "done" | "failed" | "pending" | "missing" =
      pending.has(`synthesise_country_domain:${countryId}:${d.id}`) || summary?.status === "queued" || summary?.status === "running"
        ? "pending" : summary?.status === "done" ? "done" : summary?.status === "failed" ? "failed" : "missing";
    return {
      domain: d,
      summaryStatus,
      cells: documents.map<CoverageCell>((doc) => {
        const r = current.find((x) => x.domainId === d.id && x.documentId === doc.id);
        if (pending.has(`analyse_document_domain:${doc.id}:${d.id}`) || r?.status === "running" || r?.status === "queued") {
          return { documentId: doc.id, status: "pending", items: 0 };
        }
        if (!r) return { documentId: doc.id, status: "missing", items: 0 };
        if (r.status === "failed") return { documentId: doc.id, status: "failed", items: 0 };
        const output = r.output as Json;
        const n = output.not_found ? 0 : ((output.findings as unknown[]) ?? []).length;
        return { documentId: doc.id, status: n > 0 ? "found" : "not_found", items: n };
      }),
    };
  });

  // Quote checks on the document answers.
  const docCitations = current.filter((r) => r.scope === "document" && r.status === "done").flatMap((r) => r.citations);
  const verified = { total: docCitations.length, verified: docCitations.filter((c) => c.verified).length };

  // Figures stated in the combined summaries, with the documents their quotes come from. The same
  // finding and figure stated in several domains' summaries is one row listing those domains.
  const byKey = new Map<string, FigureRow>();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[.;:,\s]+$/, "").trim();
  for (const d of domains) {
    const r = current.find((x) => x.domainId === d.id && x.scope === "country" && x.status === "done");
    const output = r?.output as Json | undefined;
    if (!output || output.not_found) continue;
    ((output.findings as Json[]) ?? []).forEach((f, i) => {
      const docs = [...new Set(r!.citations.filter((c) => c.itemPath === `findings.${i}`).map((c) => c.documentId))].sort();
      for (const n of (f.figures as Json[]) ?? []) {
        const row: FigureRow = {
          domains: [{ id: d.id, label: d.label }],
          finding: f.text as string,
          kind: f.kind as string,
          valueAsStated: n.value_as_stated as string,
          unit: (n.unit as string | null) ?? null,
          period: (n.period as string | null) ?? null,
          conditionality: (n.conditionality as string) ?? "not_stated",
          documents: docs,
        };
        const key = [norm(row.finding), row.valueAsStated, row.period ?? "", row.conditionality].join("|");
        const seen = byKey.get(key);
        if (!seen) {
          byKey.set(key, row);
          continue;
        }
        if (!seen.domains.some((x) => x.id === d.id)) seen.domains.push(row.domains[0]);
        seen.documents = [...new Set([...seen.documents, ...docs])].sort();
        if ((STAGE_OF[row.kind] ?? -1) > (STAGE_OF[seen.kind] ?? -1)) seen.kind = row.kind;
      }
    });
  }

  const pages = documents.reduce(
    (acc, d) => {
      for (const p of d.pages) {
        if (p.disposition === "unreadable") acc.unreadable++;
        else acc.read++;
      }
      return acc;
    },
    { read: 0, unreadable: 0 },
  );

  return {
    tax,
    domains,
    documents: documents.map((d) => ({ id: d.id, title: d.title, kind: d.kind, editionDate: d.editionDate, status: d.status, pageCount: d.pageCount ?? 0 })),
    coverage,
    verified,
    figures: [...byKey.values()],
    pages,
    spentUsd: results.reduce((s, r) => s + (isDemoSource(r.sources) ? 0 : r.costUsd), 0),
    summariesDone: domains.filter((d) => current.some((r) => r.domainId === d.id && r.scope === "country" && r.status === "done")).length,
    summariesTotal: domains.length,
    activeJobs: jobs.length,
  };
}

export type CountryOverview = Awaited<ReturnType<typeof currentCountryOverview>>;

export async function countryOverview(countryId: string, taxonomy?: Taxonomy, reportId?: string): Promise<CountryOverview> {
  return (await readReport(countryId, reportId))?.data.overview ?? currentCountryOverview(countryId, taxonomy);
}
