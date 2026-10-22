import { ReportLink as Link } from "@/components/report-link";
import type { CountryOverview } from "@/lib/overview";
import { KindDot, kindColor } from "./kind";
import { ChartTooltips } from "./tooltip";

function toTime(d: string) {
  return new Date(`${d}T00:00:00Z`).getTime();
}

/** The country's documents on one line, by edition date, coloured by kind and labelled directly. */
export function DocumentTimeline({ documents, iso3 }: { documents: CountryOverview["documents"]; iso3: string }) {
  if (documents.length === 0) return <p className="text-sm text-muted">No documents yet.</p>;
  const times = documents.map((d) => toTime(d.editionDate));
  const minYear = new Date(Math.min(...times)).getUTCFullYear();
  const maxYear = new Date(Math.max(...times)).getUTCFullYear() + 1;
  const start = Date.UTC(minYear, 0, 1);
  const end = Date.UTC(maxYear, 0, 1);
  const pos = (t: number) => `${(100 * (t - start)) / (end - start)}%`;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const kinds = [...new Set(documents.map((d) => d.kind))];

  return (
    <figure className="flex flex-col gap-3">
      {kinds.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <KindDot kind={k} /> {k}
            </li>
          ))}
        </ul>
      )}
      <ChartTooltips className="relative mx-4 mt-1 h-28">
        {/* Axis at 72px; years below it; documents on it, labels above in two alternating rows. */}
        <div className="absolute inset-x-0 top-[72px] h-px bg-border-strong" aria-hidden />
        {years.map((y) => (
          <span key={y} className="absolute top-[72px] flex -translate-x-1/2 flex-col items-center text-[11px] text-muted tabular" style={{ left: pos(Date.UTC(y, 0, 1)) }} aria-hidden>
            <span className="h-1.5 w-px bg-border-strong" />
            <span className="mt-1">{y}</span>
          </span>
        ))}
        {documents.map((d, i) => {
          const row = i % 2;
          const labelTop = row === 0 ? 0 : 22;
          return (
            <Link
              key={d.id}
              href={`/countries/${iso3}?tab=${d.id}`}
              data-tip-value={d.title}
              data-tip-label={`${d.id} · ${d.kind} · ${d.editionDate}`}
              aria-label={`${d.id}, ${d.title}, ${d.kind}, edition ${d.editionDate}`}
              className="group absolute top-0 flex h-[80px] -translate-x-1/2 flex-col items-center"
              style={{ left: pos(toTime(d.editionDate)) }}
            >
              <span className="font-mono text-[11px] font-medium whitespace-nowrap group-hover:underline" style={{ marginTop: labelTop }}>
                {d.id}
              </span>
              <span className="w-px flex-1 bg-border-strong" aria-hidden />
              <span className="size-3.5 shrink-0 rounded-full ring-2 ring-surface transition-transform group-hover:scale-125" style={{ background: kindColor(d.kind) }} />
            </Link>
          );
        })}
      </ChartTooltips>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Edition</th>
              <th className="py-1 pr-3 font-medium">Document</th>
              <th className="py-1 pr-3 font-medium">Kind</th>
              <th className="py-1 font-medium">Title</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-1 pr-3">{d.editionDate}</td>
                <td className="py-1 pr-3 font-mono">{d.id}</td>
                <td className="py-1 pr-3">{d.kind}</td>
                <td className="py-1">{d.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
