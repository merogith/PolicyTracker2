import { ReportLink as Link } from "@/components/report-link";
import { formatMetric } from "@/lib/dashboard-metrics";

export interface ComparisonBarRow {
  id: string;
  label: string;
  value: number | null;
  href: string;
  provisional?: boolean;
  color?: string;
}

/** All rows share a zero-based scale; null is never drawn as a measured zero. */
export function ComparisonBars({ rows, maximum, average, averageLabel = "Regional average", unit = "" }: {
  rows: ComparisonBarRow[];
  maximum: number;
  average: number | null;
  averageLabel?: string;
  unit?: string;
}) {
  const top = Math.max(1, maximum);
  return <div className="flex flex-col gap-4">
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
      {average === null ? "Average unavailable · at least two complete assessments are required." : <>
        <span className="h-4 border-l-2 border-dashed border-foreground" aria-hidden />
        {averageLabel}: <strong className="font-medium text-foreground">{formatMetric(average,unit)}{unit}</strong>
        <span>· complete assessments only</span>
      </>}
    </p>
    <ul className="flex flex-col gap-5">
      {rows.map(row => <li key={row.id}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <Link href={row.href} className="font-medium hover:text-primary-ink hover:underline">{row.label}</Link>
          <span className="flex flex-wrap items-baseline gap-2">
            {row.provisional && row.value !== null && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">Provisional</span>}
            <strong className="font-semibold tabular">{row.value === null ? "Not assessed" : `${formatMetric(row.value,unit)}${unit}`}</strong>
          </span>
        </div>
        {row.value !== null && <div className="relative h-3 rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${100 * row.value / top}%`, background: row.color }} />
          {average !== null && <span className="absolute -top-1 h-5 border-l-2 border-dashed border-foreground" style={{ left: `${100 * average / top}%` }} />}
        </div>}
      </li>)}
    </ul>
    <div className="flex justify-between text-xs text-muted tabular" aria-label={`Shared scale: zero to ${formatMetric(top,unit)}${unit}`}>
      <span>{formatMetric(0,unit)}</span><span>{formatMetric(top / 2,unit)}</span><span>{formatMetric(top,unit)}{unit}</span>
    </div>
  </div>;
}

/** Share of the fixed inventory, including unknown topics as their own row. */
export function DistributionBars({ rows, total, unit }: {
  rows: Array<{ label: string; value: number; color?: string }>;
  total: number;
  unit: string;
}) {
  return <div className="flex flex-col gap-4">
    <p className="text-xs text-muted">{total ? `Share of all ${total} ${unit} · each track = 100%` : `No ${unit} to display`}</p>
    <ol className="flex flex-col gap-4">
      {rows.map(row => {
        const share = total > 0 ? 100 * row.value / total : null;
        return <li key={row.label}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span>{row.label}</span>
            <span className="whitespace-nowrap tabular"><strong className="font-medium">{row.value}</strong><span className="text-muted"> · {share === null ? "—" : `${formatMetric(share,"%")}%`}</span></span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${share ?? 0}%`, background: row.color ?? "var(--primary)" }} />
          </div>
        </li>;
      })}
    </ol>
  </div>;
}
