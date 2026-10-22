import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { Fact, PageHeader } from "@/components/page-header";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { domainHue, hue } from "@/lib/colors";
import { db } from "@/lib/db";
import { JOB_STATUSES, JOB_TYPES } from "@/lib/domain";
import { plural } from "@/lib/plural";
import { aiMode } from "@/lib/ai-mode";

const JOB_NAMES: Record<string, string> = {
  ingest_document: "Read and index document",
  analyse_document_domain: "Analyse document",
  synthesise_country_domain: "Update country summary",
  retag_result: "Update topic labels",
  delete_document: "Delete document",
  delete_country: "Delete country",
};

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status ? sp.status : undefined;
  const type = typeof sp.type === "string" && sp.type ? sp.type : undefined;
  const iso3 = typeof sp.country === "string" && sp.country ? sp.country.toUpperCase() : undefined;
  const requestedPage = Number(sp.page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage < Number.MAX_SAFE_INTEGER / 100 ? requestedPage : 1;
  const pageSize = 100;
  const countries = await db.country.findMany({ orderBy: { iso3: "asc" } });
  const country = iso3 ? countries.find((c) => c.iso3 === iso3) : undefined;

  const scope: Prisma.JobWhereInput = {
    ...(type ? { type } : {}),
    ...(iso3 ? { countryId: country?.id ?? "-" } : {}),
  };
  const where: Prisma.JobWhereInput = { ...scope, ...(status ? { status } : {}) };
  const [jobs, totals, byStatus, active, domains, billed, demoCount, historicalCount] = await Promise.all([
    db.job.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    db.job.aggregate({ where, _count: true }),
    db.job.groupBy({ by: ["status"], where: scope, _count: true }),
    db.job.count({ where: { status: { in: ["queued", "running"] } } }),
    db.domain.findMany({ select: { id: true, label: true } }),
    db.job.aggregate({ where: { ...where, executionMode: { not: "demo" } }, _sum: { costUsd: true, inputTokens: true, outputTokens: true } }),
    db.job.count({ where: { ...where, executionMode: "demo" } }),
    db.job.count({ where: { ...where, executionMode: "unknown", costUsd: { gt: 0 } } }),
  ]);
  const iso3Of = new Map(countries.map((c) => [c.id, c.iso3]));
  const domainLabel = new Map(domains.map((k) => [k.id, k.label]));
  const countOf = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, type, country: iso3, ...patch })) if (v) q.set(k, v);
    const s = q.toString();
    return `/runs${s ? `?${s}` : ""}`;
  };
  const pill = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      on ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        crumbs={[{ label: "Runs" }]}
        title="Runs"
        meta={
          <>
            <AutoRefresh active={active > 0} />
          </>
        }
      />

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Analysis settings</summary>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          <div><dt className="text-muted">Mode</dt><dd>{aiMode() === "live" ? "Live analysis" : aiMode() === "demo" ? "Demo examples" : "API key missing"}</dd></div>
          <div><dt className="text-muted">Model</dt><dd>{process.env.OPENAI_MODEL ?? "Not configured"}</dd></div>
        </dl>
        {aiMode() === "missing_key" && <p className="mt-3 text-warn-ink">Set OPENAI_API_KEY in the server configuration to enable analysis.</p>}
        {aiMode() === "demo" && <p className="mt-3 text-muted">Set OPENAI_FAKE=0 to use live analysis. Existing demo results remain labelled until re-analyzed.</p>}
      </details>
      <div className="panel flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-xs font-medium text-muted">Status</span>
          <Link href={href({ status: undefined })} className={pill(!status)}>
            All <span className="tabular opacity-80">{byStatus.reduce((s, b) => s + b._count, 0)}</span>
          </Link>
          {JOB_STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} className={pill(status === s)}>
              {statusLabel(s)} <span className="tabular opacity-80">{countOf(s)}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-xs font-medium text-muted">Work</span>
          <Link href={href({ type: undefined })} className={pill(!type)}>
            All
          </Link>
          {JOB_TYPES.map((t) => (
            <Link key={t} href={href({ type: t })} className={pill(type === t)}>
              {JOB_NAMES[t]}
            </Link>
          ))}
        </div>
        {countries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-16 text-xs font-medium text-muted">Country</span>
            <Link href={href({ country: undefined })} className={pill(!iso3)}>
              All
            </Link>
            {countries.map((c) => (
              <Link key={c.id} href={href({ country: c.iso3 })} className={pill(iso3 === c.iso3)}>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Fact>{plural(totals._count, "job")}</Fact>
        <Fact>
          {fmtTokens(billed._sum.inputTokens ?? 0)} API tokens in · {fmtTokens(billed._sum.outputTokens ?? 0)} out
        </Fact>
        <Fact tone="primary">${(billed._sum.costUsd ?? 0).toFixed(4)} recorded API estimate</Fact>
        {demoCount > 0 && <Fact>{plural(demoCount, "demo run")} · $0</Fact>}
        <span className="text-xs text-muted">Page {page} of {Math.max(1, Math.ceil(totals._count / pageSize))}</span>
      </p>
      <p className="text-xs text-muted">
        Estimated model and search costs for these jobs, not a payment or provider invoice. Demo usage is excluded.
        Storage and work outside the job queue are not included.
        {historicalCount > 0 && ` ${plural(historicalCount, "older run")} with costs had no execution mode recorded; their estimates are retained unless confirmed as demo.`}
      </p>
      <nav aria-label="Run history pages" className="flex gap-4 text-sm">
        {page > 1 && <Link href={href({ page: String(page - 1) })} className="text-primary-ink underline">Previous page</Link>}
        {page * pageSize < totals._count && <Link href={href({ page: String(page + 1) })} className="text-primary-ink underline">Next page</Link>}
      </nav>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Work</th>
              <th className="px-4 py-2.5 font-medium">For</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Tries</th>
              <th className="px-4 py-2.5 text-right font-medium">Tokens in / out</th>
              <th className="px-4 py-2.5 text-right font-medium">Estimated cost</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Nothing here{status || type || iso3 ? " for these filters" : " yet: upload a document to start"}.
                </td>
              </tr>
            )}
            {jobs.map((j) => {
              const c = j.countryId ? iso3Of.get(j.countryId) : undefined;
              return (
                <tr key={j.id} className="align-top hover:bg-surface-2/60">
                  <td className="px-4 py-2.5 font-medium">
                    {JOB_NAMES[j.type] ?? j.type}
                    {j.executionMode === "demo" && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">Demo</span>}
                    {j.executionMode === "mixed" && <span className="ml-2 text-xs text-muted">Includes demo attempts</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {c && (
                        <Link href={`/countries/${c}`} className="rounded-md bg-primary-soft px-1.5 py-0.5 font-mono font-medium text-primary-ink hover:underline">
                          {c}
                        </Link>
                      )}
                      {j.documentId && c && (
                        <Link href={`/countries/${c}?tab=${j.documentId}`} className="font-mono hover:underline">
                          {j.documentId}
                        </Link>
                      )}
                      {j.domainId && (
                        <span className="inline-flex items-center gap-1" style={hue(domainHue(j.domainId))}>
                          <span className="hue-dot size-2 rounded-full" />
                          {domainLabel.get(j.domainId) ?? j.domainId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={j.status} />
                    {j.status === "queued" && j.runAfter > new Date() && <span className="ml-1 text-[11px] text-muted">waiting until {j.runAfter.toISOString().slice(11, 19)}</span>}
                    {j.error && <p className="mt-1 max-w-md text-xs text-bad-ink">{j.error}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {j.attempts}/{j.maxAttempts}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs tabular">{j.executionMode !== "demo" && (j.inputTokens || j.outputTokens) ? `${fmtTokens(j.inputTokens)} / ${fmtTokens(j.outputTokens)}` : "–"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular">{j.executionMode === "demo" ? "$0.0000" : j.costUsd ? `$${j.costUsd.toFixed(4)}` : "–"}</td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted tabular">{j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {(j.status === "failed" || j.status === "cancelled") && <ActionButton url={`/api/jobs/${j.id}/retry`} label="Retry" icon="retry" size="sm" />}
                    {(j.status === "queued" || j.status === "running") && <ActionButton url={`/api/jobs/${j.id}/cancel`} label="Cancel" icon="cancel" variant="danger" size="sm" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
