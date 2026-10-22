import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import type { CountryOverview } from "@/lib/overview";
import { ChartTooltips } from "./tooltip";
import { KindDot } from "./kind";

export const BUCKETS = [
  { min: 1, max: 1, label: "1" },
  { min: 2, max: 3, label: "2–3" },
  { min: 4, max: 5, label: "4–5" },
  { min: 6, max: 7, label: "6–7" },
  { min: 8, max: Infinity, label: "8+" },
];

export function bucket(n: number) {
  return BUCKETS.findIndex((b) => n >= b.min && n <= b.max) + 1;
}

/** How much each document says per domain: one cell per domain and document, ordered by finding count. */
export function CoverageHeatmap({ overview, iso3 }: { overview: CountryOverview; iso3: string }) {
  const { coverage, documents } = overview;
  if (documents.length === 0) return <p className="text-sm text-muted">No documents yet.</p>;

  return (
    <figure className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] leading-5 text-foreground" aria-label="Legend">
        <li>Findings:</li>
        {BUCKETS.map((b, i) => (
          <li key={b.label} className="flex items-center gap-1">
            <span className="size-4 shrink-0 rounded-[3px] ring-1 ring-inset ring-foreground/15" style={{ background: `var(--heat-${i + 1})` }} aria-hidden />
            {b.label}
          </li>
        ))}
        <li className="flex items-center gap-1">
          <Ban className="size-3" aria-hidden /> not found
        </li>
        <li className="flex items-center gap-1">
          <Loader2 className="size-3" aria-hidden /> running
        </li>
        <li className="flex items-center gap-1">
          <AlertTriangle className="size-3" aria-hidden /> failed
        </li>
        <li className="flex items-center gap-1">
          <span className="size-3 rounded-[3px]" style={{ background: "var(--data-unavailable-soft)" }} aria-hidden /> not run
        </li>
      </ul>
      <ChartTooltips className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[13px]">
          <thead>
            <tr>
              <th className="w-52 text-left font-medium text-muted">Domain</th>
              {documents.map((d) => (
                <th key={d.id} className="min-w-24 px-1 pb-1 text-center font-medium">
                  <Link href={`/countries/${iso3}?tab=${d.id}`} className="inline-flex flex-col items-center gap-0.5 hover:underline">
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <KindDot kind={d.kind} /> {d.id}
                    </span>
                    <span className="font-normal text-muted">{d.editionDate.slice(0, 7)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coverage.map((row) => (
              <tr key={row.domain.id}>
                <th scope="row" className="pr-2 text-left font-normal">
                  <span className="text-sm">
                    {row.domain.label}
                  </span>
                </th>
                {row.cells.map((c) => {
                  const b = c.status === "found" ? bucket(c.items) : 0;
                  const tipValue =
                    c.status === "found" ? `${c.items} finding${c.items === 1 ? "" : "s"}` : c.status === "not_found" ? "Not found" : c.status === "pending" ? "Running" : c.status === "failed" ? "Failed" : "Not run";
                  return (
                    <td key={c.documentId} className="p-0">
                      <Link
                        href={`/countries/${iso3}/documents/${c.documentId}#domain-${row.domain.id}`}
                        data-tip-value={tipValue}
                        data-tip-label={`${row.domain.label} · ${c.documentId}`}
                        aria-label={`${row.domain.label} in ${c.documentId}: ${tipValue}`}
                        className="flex min-h-11 items-center justify-center rounded-md font-semibold tabular transition-[filter] hover:brightness-105"
                        style={b ? { background: `var(--heat-${b})`, color: `var(--heat-ink-${b})` } : { background: c.status === "not_found" ? "var(--surface-2)" : "var(--data-unavailable-soft)" }}
                      >
                        {c.status === "found" && c.items}
                        {c.status === "not_found" && <span className="text-xs font-normal text-muted">Not found</span>}
                        {c.status === "pending" && <span className="flex items-center gap-1 text-xs font-normal text-primary-ink"><Loader2 className="size-3.5 animate-spin" aria-hidden/>Running</span>}
                        {c.status === "failed" && <span className="flex items-center gap-1 text-xs font-normal text-bad-ink"><AlertTriangle className="size-3.5" aria-hidden/>Failed</span>}
                        {c.status === "missing" && <span className="text-xs font-normal text-muted">Not run</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ChartTooltips>
      <figcaption className="text-xs text-muted">
        Findings in each document&apos;s answer to the domain&apos;s question. &quot;Not found&quot; means not found in the pages searched. Select a cell to open that answer.
      </figcaption>
    </figure>
  );
}
