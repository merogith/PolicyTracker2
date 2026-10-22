import { FINDING_KINDS } from "@/lib/colors";
import { ChartTooltips } from "./tooltip";

const FILL = ["var(--ladder-0)", "var(--ladder-1)", "var(--ladder-2)", "var(--ladder-3)", "var(--ladder-4)", "var(--ladder-other)"];
const STAGE_LABELS = (["concern", "commitment", "planned_action", "underway", "delivered"] as const).map((k) => FINDING_KINDS[k].label);

export interface StageRow {
  id: string;
  label: string;
  href?: string;
  marker?: React.ReactNode;
  /** Five stage counts (concern … delivered) and a sixth for items without a stage. */
  counts: number[];
  ready: boolean;
  empty?: string;
}

function niceTicks(max: number) {
  if (max <= 0) return [0];
  const step = [1, 2, 5, 10, 20, 50, 100].find((s) => max / s <= 5) ?? Math.ceil(max / 5);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

/** One stacked bar per row: distinctly colored stages in labelled progression order. */
export function StageChart({
  rows,
  otherLabel,
  caption,
  wideLabels = false,
  scaleMax,
}: {
  rows: StageRow[];
  otherLabel: string;
  caption: React.ReactNode;
  wideLabels?: boolean;
  /** Shared top of the scale when several charts are compared side by side. */
  scaleMax?: number;
}) {
  const labels = [...STAGE_LABELS, otherLabel];
  const totals = rows.filter((r) => r.ready).map((r) => r.counts.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(Math.max(...totals, scaleMax ?? 0, 1));
  const max = ticks[ticks.length - 1] || 1;
  const pct = (n: number) => `${(100 * n) / max}%`;
  const grid = `grid grid-cols-1 items-center gap-x-3 gap-y-0.5 ${wideLabels ? "sm:grid-cols-[minmax(8rem,20rem)_1fr]" : "sm:grid-cols-[minmax(7rem,13rem)_1fr]"}`;

  return (
    <figure className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] leading-5 text-foreground" aria-label="Legend">
        {labels.map((l, i) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className="h-4 w-5 shrink-0 rounded-[3px] ring-1 ring-inset ring-foreground/15" style={{ background: FILL[i] }} aria-hidden />
            {l}
          </li>
        ))}
      </ul>
      <ChartTooltips className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const total = r.counts.reduce((a, b) => a + b, 0);
          const parts = r.counts.map((n, i) => ({ n, i })).filter((p) => p.n > 0);
          const label = (
            <>
              {r.marker}
              <span className="truncate">{r.label}</span>
            </>
          );
          return (
            <div key={r.id} className={grid}>
              {r.href ? (
                <a href={r.href} className="flex min-w-0 items-center gap-2 text-[13px] hover:underline">
                  {label}
                </a>
              ) : (
                <span className="flex min-w-0 items-center gap-2 text-[13px]">{label}</span>
              )}
              <div className="relative flex h-6 items-center">
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-[var(--grid)]" style={{ left: pct(t) }} aria-hidden />
                ))}
                {!r.ready ? (
                  <span className="relative text-xs text-muted">running…</span>
                ) : total === 0 ? (
                  <span className="relative text-xs text-muted">{r.empty ?? "nothing found"}</span>
                ) : (
                  <>
                    <div className="relative flex h-3.5 gap-[2px]" style={{ width: pct(total) }}>
                      {parts.map(({ n, i }, j) => (
                        <span
                          key={i}
                          tabIndex={0}
                          data-tip-value={`${n} ${labels[i].toLowerCase()}`}
                          data-tip-label={r.label}
                          aria-label={`${r.label}: ${n} ${labels[i]}`}
                          className={`h-full outline-offset-1 transition-[filter] hover:brightness-110 ${j === parts.length - 1 ? "rounded-r-[4px]" : ""}`}
                          style={{ flexGrow: n, flexBasis: 0, background: FILL[i] }}
                        />
                      ))}
                    </div>
                    <span className="relative ml-2 text-xs text-muted tabular">{total}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div className={grid} aria-hidden>
          <span className="hidden sm:block" />
          <div className="relative h-4 text-[11px] text-muted tabular">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </ChartTooltips>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as table</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium" />
                {labels.map((l) => (
                  <th key={l} className="py-1 pr-3 text-right font-medium">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1 pr-3">{r.label}</td>
                  {r.counts.map((n, i) => (
                    <td key={i} className="py-1 pr-3 text-right">
                      {r.ready ? n : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <figcaption className="text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
