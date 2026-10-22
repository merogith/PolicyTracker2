import { formatMetric, type DashboardMetric } from "@/lib/dashboard-metrics";
// Display precision is independent of the full-precision scoring and color thresholds.
export function presentedScore(value: number | null, metric: DashboardMetric, normalized: boolean, unit: string) {
  return formatMetric(value, normalized || metric === "detail" ? "/100" : unit);
}

/** Shared presentation only: thresholds and values remain in the scoring adapters. */
export function ScoreBadge({ value, unit, state = "ready", emptyLabel }: {
  value: string; unit: string; state?: "ready" | "unavailable" | "no-action"; emptyLabel?: string;
}) {
  return <span className="policy-score-value" data-state={state}>
    <span className="policy-score-badge"><strong>{value}</strong>{state === "ready" && <small>{unit}</small>}</span>
    {state !== "ready" && <small className="policy-score-empty">{emptyLabel ?? "Unavailable"}</small>}
  </span>;
}

export function ScoreColorKey({ metric, normalized = false }: { metric: DashboardMetric; normalized?: boolean }) {
  const relative = normalized || ["claim_points", "claims", "actions"].includes(metric);
  const stage = metric === "detail" && !normalized;
  const colors = relative ? ["compare-below-2", "compare-below-1", "compare-neutral", "compare-above-1", "compare-above-2"] : ["doc-low", "doc-mid-low", "doc-mid", "doc-mid-high", "doc-high"];
  return <div className="policy-score-key" aria-label={relative ? "Colors compare the same measure within the region" : stage ? "Colors show earlier to later reported action stages" : "Colors show lower to higher topic coverage"}>
    <span>{relative ? "Regional comparison" : stage ? "Reported stage" : "Topic coverage"}</span>
    <span className="policy-score-key-range">{stage ? "Earlier" : "Lower"}<span className="policy-score-swatches" aria-hidden>{colors.map(color => <i key={color} style={{ background: `var(--${color})` }} />)}</span>{stage ? "Later" : "Higher"}</span>
    {normalized && <span>50 = regional average</span>}
  </div>;
}
