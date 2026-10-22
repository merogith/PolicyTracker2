import { ReportLink as Link } from "@/components/report-link";
import { ReportInput } from "@/components/report-link";
import { ChevronDown } from "lucide-react";
import { CLAIM_STAGES, DASHBOARD_METRICS, DEFAULT_ACTION_STAGES, metricLabel, supportsNormalization, type DashboardMetric, type MetricScale } from "@/lib/dashboard-metrics";
import { ScoreColorKey } from "./score-presentation";
const PRESENTED_METRICS = DASHBOARD_METRICS;

export interface MetricControlProps {
  pathname: string;
  fixed: Record<string, string>;
  metricKey?: "metric" | "matrix";
  metric: DashboardMetric;
  scale: MetricScale;
  stages: number[];
  showScale?: boolean;
  compact?: boolean;
}

function controlUrl(props: MetricControlProps, changes: Record<string, string> = {}) {
  return `${props.pathname}?${new URLSearchParams({ ...props.fixed, [props.metricKey ?? "metric"]: props.metric, scale: props.scale, stages: props.stages.join(","), ...changes })}`;
}

const segment = (active: boolean) => `rounded-md px-3 py-2 text-xs font-medium ${active ? "bg-surface text-primary-ink shadow-card" : "text-muted hover:text-foreground"}`;

export function MetricControls(props: MetricControlProps) {
  if (props.compact) return <div className="flex flex-wrap items-center justify-between gap-3">
    <details key={props.metric} className="group relative">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-md py-1 text-base font-semibold hover:text-primary-ink [&::-webkit-details-marker]:hidden">
        {metricLabel(props.metric)}<ChevronDown className="size-4 text-muted group-open:rotate-180" aria-hidden/>
      </summary>
      <nav aria-label="Dashboard metric" className="absolute left-0 top-full z-20 mt-2 flex w-60 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-card">
        {PRESENTED_METRICS.map(metric=><Link key={metric} href={controlUrl(props,{[props.metricKey??"metric"]:metric})} aria-current={props.metric===metric?"page":undefined} className={`rounded-lg px-3 py-2.5 text-sm ${props.metric===metric?"bg-primary-soft font-medium text-primary-ink":"hover:bg-surface-2"}`}>{metricLabel(metric)}</Link>)}
      </nav>
    </details>
    {props.showScale!==false&&supportsNormalization(props.metric)&&<nav aria-label="Metric scale" className="flex gap-1 rounded-lg bg-surface-2 p-1">
      <Link href={controlUrl(props,{scale:"raw"})} aria-current={props.scale==="raw"?"page":undefined} className={segment(props.scale==="raw")}>Original</Link>
      <Link href={controlUrl(props,{scale:"normalized"})} aria-current={props.scale==="normalized"?"page":undefined} className={segment(props.scale==="normalized")}>Normalized</Link>
    </nav>}
  </div>;
  return <div className="flex max-w-full flex-wrap items-end gap-x-5 gap-y-3">
    <div className="min-w-0"><p className="mb-1.5 text-xs font-medium text-muted">Measure</p>
    <nav aria-label="Dashboard metric" className="flex max-w-full flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
      {PRESENTED_METRICS.map(metric => <Link key={metric} href={controlUrl(props, { [props.metricKey ?? "metric"]: metric })} aria-current={props.metric === metric ? "page" : undefined} className={segment(props.metric === metric)}>{metricLabel(metric)}</Link>)}
    </nav></div>
    {props.showScale !== false && supportsNormalization(props.metric) && <div><p className="mb-1.5 text-xs font-medium text-muted">Scale</p><nav aria-label="Metric scale" className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
      {(["raw", "normalized"] as const).map(scale => <Link key={scale} href={controlUrl(props, { scale })} aria-current={props.scale === scale ? "page" : undefined} className={segment(props.scale === scale)}>{scale === "raw" ? "Original" : "Normalized"}</Link>)}
    </nav></div>}
  </div>;
}

export function ActionStageSettings(props: MetricControlProps) {
  if (props.metric !== "actions") return null;
  const selection = props.stages.length ? props.stages.join(", ") : "none";
  return <details className="rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
    <summary className="w-fit cursor-pointer font-medium hover:text-foreground">Action definition · stages {selection} <span className="ml-2 text-primary-ink">Edit</span></summary>
    <form key={props.stages.join(",")} action={props.pathname} method="get" className="mt-4 flex flex-col gap-4">
      <ReportInput />
      {Object.entries({ ...props.fixed, [props.metricKey ?? "metric"]: props.metric, scale: props.scale }).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="stages" value="" />
      <fieldset>
        <legend className="mb-3 font-medium text-foreground">Count claims at these stages</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-3">{CLAIM_STAGES.map(stage => <label key={stage.value} className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="stages" value={stage.value} defaultChecked={props.stages.includes(stage.value)} className="size-4 accent-primary" />{stage.value} · {stage.label}</label>)}</div>
      </fieldset>
      <p>Each claim counts once at the selected stages. This changes action counts only. <Link href="/methodology#claim-points" className="text-primary-ink hover:underline">Methodology</Link></p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm">Apply stages</button>
        <Link href={controlUrl(props, { stages: DEFAULT_ACTION_STAGES.join(",") })} className="hover:text-primary-ink hover:underline">Default (1–4)</Link>
        <Link href={controlUrl(props, { stages: "3,4" })} className="hover:text-primary-ink hover:underline">Implementation only (3–4)</Link>
      </div>
    </form>
  </details>;
}

export function NormalizationNote() {
  return <p className="text-xs leading-relaxed text-muted">Standardized scores compare countries on a 0–100 scale, with the regional average at 50. <Link href="/methodology#comparison" className="text-primary-ink hover:underline">Comparison methodology</Link></p>;
}

export function DeviationLegend() {
  return <ScoreColorKey metric="claim_points"/>;
}
