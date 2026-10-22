import { ArrowDownRight, ArrowRight, ArrowUpRight, CornerDownRight, Sparkles } from "lucide-react";
import type { CountryTopics } from "@/lib/topics";
import { ScoreChip, StatusSwatch, statusColors, statusLabel, trendLabel } from "./stage";
import { ChartTooltips } from "./tooltip";
import { plural } from "@/lib/plural";

type Domains = CountryTopics["domains"];

const TREND_ICON = { further: ArrowUpRight, same: ArrowRight, less: ArrowDownRight, new: Sparkles, not_repeated: CornerDownRight } as const;

/** One tile per domain, like an SDG dashboard: colour = furthest stage documented, arrow = latest edition vs earlier. */
export function DomainTiles({ domains, base }: { domains: Domains; base: string }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
      {domains.map((d) => {
        const { fill, ink } = statusColors(d.summary.status);
        const Icon = d.summary.trend ? TREND_ICON[d.summary.trend] : null;
        return (
          <li key={d.domain.id}>
            <a
              href={`${base}&domain=${d.domain.id}`}
              className="panel group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
              aria-label={`${d.domain.label}: ${statusLabel(d.summary.status)}, ${d.counts.total} findings, ${trendLabel(d.summary.trend)}`}
            >
              <div className="flex h-16 items-start justify-between px-3 pt-2" style={{ background: fill, color: ink }}>
                <span className="text-2xl leading-none font-bold tracking-tight">{d.domain.prefix}</span>
                {Icon && <Icon className="size-6" aria-hidden />}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                <span className="text-[13px] leading-tight font-semibold group-hover:text-primary-ink">{d.domain.label}</span>
                <span className="text-[11px] text-muted">
                  {statusLabel(d.summary.status)} · {d.topicsTouched}/{d.topicCount} home topics
                </span>
                <span className="mt-auto flex items-center justify-between gap-1 pt-1">
                  <span className="text-[11px] whitespace-nowrap tabular">{plural(d.counts.total, "finding")}</span>
                  <ScoreChip score={d.score.scored ? d.score : null} compact />
                </span>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function DomainLegend() {
  const statuses = [
    { kind: "none" as const },
    { kind: "no_stage" as const },
    ...[0, 1, 2, 3, 4].map((stage) => ({ kind: "stage" as const, stage })),
  ];
  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Colour: furthest stage documented">
        {statuses.map((s) => (
          <li key={statusLabel(s)} className="flex items-center gap-1.5">
            <StatusSwatch status={s} /> {statusLabel(s)}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Arrow: latest edition compared with earlier ones">
        {(Object.keys(TREND_ICON) as Array<keyof typeof TREND_ICON>).map((t) => {
          const Icon = TREND_ICON[t];
          return (
            <li key={t} className="flex items-center gap-1">
              <Icon className="size-3.5" aria-hidden /> {trendLabel(t)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function wedge(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

/** Findings per domain around a circle; area grows with the count (square-root radius). */
export function DomainRadial({ domains, base }: { domains: Domains; base: string }) {
  const size = 320;
  const c = size / 2;
  const r0 = 30;
  const R = 122;
  const max = Math.max(1, ...domains.map((d) => d.counts.total));
  const radius = (n: number) => r0 + (R - r0) * Math.sqrt(n / max);
  const step = (2 * Math.PI) / domains.length;
  const gap = 0.025;
  const rings = [0.25, 0.5, 1].map((f) => Math.max(1, Math.round(max * f))).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <figure className="flex flex-col items-center gap-3">
      <ChartTooltips className="w-full max-w-[22rem]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label="Findings per domain">
          {rings.map((v) => (
            <g key={v}>
              <circle cx={c} cy={c} r={radius(v)} fill="none" stroke="var(--grid)" strokeWidth={1} />
              <text x={c + 3} y={c - radius(v) + 10} fontSize={9} fill="var(--muted)">
                {v}
              </text>
            </g>
          ))}
          {domains.map((d, i) => {
            const a0 = -Math.PI / 2 + i * step + gap;
            const a1 = -Math.PI / 2 + (i + 1) * step - gap;
            const mid = (a0 + a1) / 2;
            const n = d.counts.total;
            const { fill } = statusColors(d.summary.status);
            return (
              <a key={d.domain.id} href={`${base}&domain=${d.domain.id}`}>
                <path
                  d={wedge(c, c, r0, n ? radius(n) : r0 + 2, a0, a1)}
                  fill={n ? fill : "var(--surface-2)"}
                  stroke={n ? "none" : "var(--border-strong)"}
                  strokeWidth={n ? 0 : 1}
                  tabIndex={0}
                  data-tip-value={`${n} finding${n === 1 ? "" : "s"} · ${statusLabel(d.summary.status)}`}
                  data-tip-label={`${d.domain.label} · ${trendLabel(d.summary.trend)}`}
                  aria-label={`${d.domain.label}: ${n} findings, ${statusLabel(d.summary.status)}`}
                  className="transition-[filter] hover:brightness-110"
                />
                <text
                  x={c + (R + 16) * Math.cos(mid)}
                  y={c + (R + 16) * Math.sin(mid)}
                  fontSize={10}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--foreground)"
                >
                  {d.domain.prefix}
                </text>
              </a>
            );
          })}
        </svg>
      </ChartTooltips>
      <details className="w-full text-xs">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as table</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Domain</th>
                <th className="py-1 pr-3 text-right font-medium">Findings</th>
                <th className="py-1 pr-3 font-medium">Furthest stage</th>
                <th className="py-1 pr-3 font-medium">Latest edition</th>
                <th className="py-1 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.domain.id} className="border-t border-border">
                  <td className="py-1 pr-3">{d.domain.label}</td>
                  <td className="py-1 pr-3 text-right tabular">{d.counts.total}</td>
                  <td className="py-1 pr-3">{statusLabel(d.summary.status)}</td>
                  <td className="py-1 pr-3">{trendLabel(d.summary.trend)}</td>
                  <td className="py-1 tabular">{d.score.scored ? `${d.score.sum} / ${d.score.topics}` : "not scored"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <figcaption className="text-center text-xs text-muted">Wedge area grows with the number of distinct findings; colour is the furthest stage. Domains overlap, so wedges are not added up.</figcaption>
    </figure>
  );
}
