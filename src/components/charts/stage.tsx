import { ArrowDownRight, ArrowRight, ArrowUpRight, CornerDownRight, Sparkles } from "lucide-react";
import { FINDING_KINDS } from "@/lib/colors";
import { formatScore, RUBRIC, type DomainScore, type TopicStatus } from "@/lib/scoring";
import type { Trend } from "@/lib/topic-merge";

const STAGE_KEYS = ["concern", "commitment", "planned_action", "underway", "delivered"] as const;

/** Fill and text colour for a status: ordered score colours, grey for "no stage", surface for none. */
export function statusColors(status: TopicStatus): { fill: string; ink: string } {
  if (status.kind === "stage") return { fill: `var(--ladder-${status.stage})`, ink: `var(--ladder-ink-${status.stage})` };
  if (status.kind === "no_stage") return { fill: "var(--ladder-other)", ink: "var(--ladder-ink-other)" };
  return { fill: "var(--surface-2)", ink: "var(--muted)" };
}

export function statusLabel(status: TopicStatus) {
  if (status.kind === "stage") return FINDING_KINDS[STAGE_KEYS[status.stage]].label;
  if (status.kind === "no_stage") return "Mentioned only";
  return "No findings";
}

export function StatusSwatch({ status }: { status: TopicStatus }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-[3px] ring-1 ring-border" style={{ background: statusColors(status).fill }} aria-hidden />;
}

const TREND: Record<Exclude<Trend, null>, { label: string; icon: typeof ArrowRight }> = {
  further: { label: "Latest goes further", icon: ArrowUpRight },
  same: { label: "Latest holds", icon: ArrowRight },
  less: { label: "Latest goes less far", icon: ArrowDownRight },
  new: { label: "New in latest", icon: Sparkles },
  not_repeated: { label: "Not repeated in latest", icon: CornerDownRight },
};

export function trendLabel(trend: Trend) {
  return trend ? TREND[trend].label : "One edition only";
}

/** Trend as an icon plus words, never colour alone. */
export function TrendBadge({ trend, compact = false }: { trend: Trend; compact?: boolean }) {
  if (!trend) return compact ? null : <span className="text-[11px] text-muted">one edition</span>;
  const { label, icon: Icon } = TREND[trend];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" title={label}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

export function scoreBucket(sum: number, topics: number) {
  if (topics === 0) return "0";
  const r = sum / topics;
  if (r > 0.5) return "pos-2";
  if (r > 0) return "pos-1";
  if (r < -0.5) return "neg-2";
  if (r < 0) return "neg-1";
  return "0";
}

/** A domain or topic score from the scoring layer, labelled with its rubric version. */
export function ScoreChip({ score, size = "sm", compact = false }: { score: DomainScore | number | null; size?: "sm" | "md"; compact?: boolean }) {
  const title = `Score, rubric ${RUBRIC.id} v${RUBRIC.version}`;
  if (score === null) {
    return (
      <span title={`${title}: not scored (no findings)`} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted">
        {compact ? "–" : "not scored"}
        {compact && <span className="sr-only">not scored</span>}
      </span>
    );
  }
  const sum = typeof score === "number" ? score : score.sum;
  const of = typeof score === "number" ? 1 : score.topics;
  const b = scoreBucket(sum, of);
  return (
    <span
      title={typeof score === "number" ? title : `${title}: sum over ${score.scored} scored of ${score.topics} topics`}
      className={`inline-flex items-baseline gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular ${size === "md" ? "text-sm" : "text-[11px]"}`}
      style={{ background: `var(--score-${b})`, color: `var(--score-ink-${b})` }}
    >
      {formatScore(sum)}
      {typeof score !== "number" && <span className="font-normal opacity-80">/{score.topics}</span>}
    </span>
  );
}
