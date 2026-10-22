"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { formatMetric } from "@/lib/dashboard-metrics";
import type { DashboardMetric } from "@/lib/dashboard-metrics";
import { presentedScore, ScoreBadge } from "@/components/charts/score-presentation";

export interface RadarAxis {
  id: string;
  label: string;
  value: number | null;
  peer: number | null;
  reference: number | null;
}

const SHORT_LABELS: Record<string, string[]> = {
  climate: ["Climate"], disaster_risk: ["Disaster risk"], agriculture: ["Agriculture", "& food"],
  water: ["Water"], nature_land: ["Nature & land"], energy: ["Energy"],
};

/** Every spoke shares one scale. Missing observations never become zero vertices. */
export function DomainRadar({ axes, country, peer, maximum, unit, metric, normalized, onSelect, selected }: {
  axes: RadarAxis[]; country: string; peer?: string; maximum: number; unit: string;
  metric: DashboardMetric; normalized: boolean;
  onSelect: (id: string) => void; selected: string;
}) {
  const titleId = useId();
  const point = (index: number, value: number, radius = 112) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / axes.length;
    const distance = radius * Math.max(0, Math.min(1, value / maximum));
    return { x: 240 + distance * Math.cos(angle), y: 176 + distance * Math.sin(angle) };
  };
  const points = (values: number[]) => values.map((value, i) => { const p = point(i, value); return `${p.x},${p.y}`; }).join(" ");
  const display = (value: number | null) => presentedScore(value, metric, normalized, unit);
  const comparison = peer ? axes.map(a => a.peer) : axes.map(a => a.reference);
  const hasComparison = comparison.some(value => value !== null);
  const series = (values: Array<number | null>, className: string, diamonds = false) => <g className={className}>
    {values.every(value => value !== null) && <polygon points={points(values as number[])} className="ptd-radarArea" />}
    {values.map((value, i) => {
      if (value === null) return null;
      const p = point(i, value), next = values[(i + 1) % values.length];
      const end = next === null ? null : point((i + 1) % values.length, next);
      return <g key={axes[i].id}>
        {end && <line x1={p.x} y1={p.y} x2={end.x} y2={end.y} />}
        {diamonds ? <rect x={p.x - 3.5} y={p.y - 3.5} width={7} height={7} transform={`rotate(45 ${p.x} ${p.y})`} /> : <circle cx={p.x} cy={p.y} r={3.8} />}
      </g>;
    })}
  </g>;
  return <div className="ptd-radar" data-testid="domain-radar">
    <div className="ptd-radarLegend"><span><i className="ptd-countryDot" />{country}</span>
      {hasComparison && <span><i className={peer ? "ptd-peerDot" : "ptd-radarReferenceKey"} />{peer ?? "Regional average"}</span>}
      <span className="ptd-radarUnit">0–{display(maximum)}{unit === "/100" ? "" : " " + unit}</span>
    </div>
    <svg viewBox="0 0 480 354" role="group" aria-labelledby={titleId}>
      <title id={titleId}>{`Domain profile for ${country}${peer ? " compared with " + peer : ""}. All axes use the same scale. Select a domain to explore its topics.`}</title>
      <g className="ptd-radarGrid" aria-hidden="true">
        {[.25, .5, .75, 1].map(fraction => <polygon key={fraction} points={points(axes.map(() => maximum * fraction))} />)}
        {axes.map((axis, i) => { const p = point(i, maximum); return <line key={axis.id} x1={240} y1={176} x2={p.x} y2={p.y} />; })}
        <text x={247} y={115}>{display(maximum / 2)}</text>
      </g>
      <g aria-hidden="true">
        {hasComparison && series(comparison, peer ? "ptd-radarPeer" : "ptd-radarReference", !!peer)}
        {series(axes.map(a => a.value), "ptd-radarCountry")}
      </g>
      {axes.map((axis, i) => {
        const p = point(i, maximum, 141), lines = SHORT_LABELS[axis.id] ?? [axis.label];
        const anchor = p.x > 250 ? "start" : p.x < 230 ? "end" : "middle";
        return <g key={axis.id} className="ptd-radarLabel" role="button" tabIndex={0} data-selected={selected === axis.id}
          aria-label={`${axis.label}: ${country} ${display(axis.value)} ${unit}${peer ? `; ${peer} ${display(axis.peer)} ${unit}` : ""}. Explore topics`}
          onClick={() => onSelect(axis.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(axis.id); } }}>
          <title>{`${axis.label}: ${display(axis.value)} ${unit}`}</title>
          <text x={p.x} y={p.y - (i === 0 ? 10 : 0)} textAnchor={anchor}>
            {lines.map((line, j) => <tspan key={line} x={p.x} dy={j ? "1.2em" : 0}>{line}</tspan>)}
            <tspan className="ptd-radarLabelValue" x={p.x} dy="1.4em">{display(axis.value)}</tspan>
          </text>
        </g>;
      })}
    </svg>
    <details className="ptd-chartValues"><summary>View values</summary>
      <table><caption className="ptd-srOnly">Domain values on a shared scale, {unit}</caption>
        <thead><tr><th scope="col">Domain</th><th scope="col">{country}</th>{hasComparison && <th scope="col">{peer ?? "Regional average"}</th>}</tr></thead>
        <tbody>{axes.map((axis, i) => <tr key={axis.id}><th scope="row">{axis.label}</th><td>{display(axis.value)}</td>{hasComparison && <td>{display(comparison[i])}</td>}</tr>)}</tbody>
      </table>
    </details>
  </div>;
}

interface ExplorerItem {
  id: string; label: string; value: number | null; display: string;
  color: string; ink: string; colorMeaning: string; href: string;
  state: "ready" | "unavailable" | "no-action";
}
export interface ExplorerDomain extends ExplorerItem { context: string; topics: ExplorerItem[] }

/** Domain and topic bars each use a common range; color keeps its existing scoring meaning. */
export function DomainExplorer({ domains, metric, unit, fixedScale, colorKey }: {
  domains: ExplorerDomain[]; metric: string; unit: string; fixedScale: boolean; colorKey: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef("");
  const selected = domains.find(domain => domain.id === selectedId);
  // All 64 topics share a scale, even when only one domain's topics are visible.
  const scaleItems = selected ? domains.flatMap(domain => domain.topics) : domains;
  const maximum = fixedScale ? 100 : Math.max(1, ...scaleItems.map(item => item.value ?? 0));
  const scaleLabel = `0–${formatMetric(maximum, "")}${unit === "/100" ? "" : " " + (unit === "topics" ? "%" : unit)}`;
  useEffect(() => {
    if (selectedId) headingRef.current?.focus();
    else if (returnFocus.current) cards.current.get(returnFocus.current)?.focus();
  }, [selectedId]);
  const goBack = () => setSelectedId("");
  const valueLabel = (item: ExplorerItem) => item.state === "no-action" ? "No action claims" : item.state === "unavailable" ? "Unavailable" : `${item.display} ${unit}`;
  const bar = (item: ExplorerItem) => <span className="ptd-explorerBar" data-state={item.state} aria-hidden>
    {item.value !== null && <i style={{ width: `${Math.max(0, Math.min(100, item.value / maximum * 100))}%` }} />}
  </span>;
  const value = (item: ExplorerItem) => <ScoreBadge value={item.display} unit={unit} state={item.state} emptyLabel={valueLabel(item)} />;
  return <section className="ptd-explorer" aria-label="Explore domains and topics" data-testid="domain-explorer"
    onKeyDown={event => { if (selected && event.key === "Escape") { event.preventDefault(); goBack(); } }}>
    <div className="ptd-explorerHeading">
      <div>{selected && <button type="button" className="ptd-explorerBack" onClick={goBack}><ArrowLeft size={13} aria-hidden />All domains</button>}
        <h2 ref={headingRef} tabIndex={-1}>{selected ? selected.label : "Domains & topics"}<span>{selected ? `${selected.topics.length} topics` : `${domains.length} domains · ${domains.reduce((sum, domain) => sum + domain.topics.length, 0)} topics`}</span></h2>
        <p>{selected ? "Choose a topic to open its evidence." : "Choose a domain to explore its topics."}</p>
      </div>
      <div className="ptd-explorerMeasure"><span>{metric}</span><small>Bar scale {scaleLabel}</small></div>
    </div>
    <div className="ptd-explorerKeys">{colorKey}</div>
    {selected ? <>
      <div className="ptd-explorerTopics">{selected.topics.map(topic => <a key={topic.id} href={topic.href} className="ptd-explorerTopic"
        style={{ "--mark": topic.color, "--score-ink": topic.ink } as CSSProperties} data-state={topic.state}
        aria-label={`${topic.label}: ${valueLabel(topic)}. ${topic.colorMeaning ? topic.colorMeaning + ". " : ""}Open evidence`}>
        <span className="ptd-explorerTopicName">{topic.label}</span>
        <span className="ptd-explorerTopicMetric">{value(topic)}{bar(topic)}</span><ArrowUpRight size={15} aria-hidden />
      </a>)}</div>
      <a className="ptd-explorerEvidence" href={selected.href}>View all {selected.label} evidence<ArrowUpRight size={14} aria-hidden /></a>
    </> : <>
      <div className="ptd-domainCards" data-expanded={expanded}>{domains.map(domain => <button key={domain.id} type="button" className="ptd-domainCard policy-score-card"
        ref={node => { if (node) cards.current.set(domain.id, node); else cards.current.delete(domain.id); }}
        style={{ "--mark": domain.color, "--score-ink": domain.ink } as CSSProperties} data-state={domain.state}
        aria-label={`${domain.label}: ${valueLabel(domain)}. ${domain.colorMeaning ? domain.colorMeaning + ". " : ""}${domain.context}. Explore topics`}
        onClick={() => { returnFocus.current = domain.id; setSelectedId(domain.id); }}>
        <span className="ptd-cardName">{domain.label}<ArrowRight size={14} aria-hidden /></span>
        <span className="ptd-cardSummary">{value(domain)}<span className="ptd-cardContext">{domain.context}</span></span>
        {bar(domain)}
      </button>)}</div>
      {domains.length > 6 && <button type="button" className="ptd-explorerExpand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Show six domains" : `All ${domains.length} domains`}<ChevronDown size={14} aria-hidden />
      </button>}
    </>}
  </section>;
}
