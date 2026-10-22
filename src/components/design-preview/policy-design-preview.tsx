"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CloudSun, FileSpreadsheet, FileText, Layers, LayoutDashboard, Leaf, Network, Scale, ShieldCheck, Sprout, Target, Trees, Waves, X, Zap } from "lucide-react";
import { PREVIEW_DOMAINS, PREVIEW_LABELS, PREVIEW_METRICS, previewUnit, type PreviewCountry, type PreviewMetric, type PreviewScope, type PreviewTone } from "@/lib/dashboard-preview";
import "./preview.css";
import { DomainExplorer, DomainRadar, type ExplorerDomain } from "./overview-visuals";
import { presentedScore, ScoreColorKey } from "@/components/charts/score-presentation";
import { ActionStageSettings } from "@/components/charts/metric-controls";
import { DEFAULT_ACTION_STAGES } from "@/lib/dashboard-metrics";
import { assignLocation, BASE_PATH } from "@/lib/static-demo";

const styles = {
  axis: "ptd-axis",
  back: "ptd-back",
  chartKey: "ptd-chartKey",
  closeButton: "ptd-closeButton",
  colorKey: "ptd-colorKey",
  compareSelect: "ptd-compareSelect",
  connector: "ptd-connector",
  countryDot: "ptd-countryDot",
  countrySelect: "ptd-countrySelect",
  coverage: "ptd-coverage",
  detail: "ptd-detail",
  domainName: "ptd-domainName",
  domainRow: "ptd-domainRow",
  endpoint: "ptd-endpoint",
  eyebrow: "ptd-eyebrow",
  footer: "ptd-footer",
  headerActions: "ptd-headerActions",
  heading: "ptd-heading",
  matrix: "ptd-matrix",
  matrixScroll: "ptd-matrixScroll",
  method: "ptd-method",
  metricSelect: "ptd-metricSelect",
  metricValue: "ptd-metricValue",
  micro: "ptd-micro",
  peerDot: "ptd-peerDot",
  peerEndpoint: "ptd-peerEndpoint",
  preview: "ptd-preview",
  previewLabel: "ptd-previewLabel",
  primaryEndpoint: "ptd-primaryEndpoint",
  profile: "ptd-profile",
  referenceKey: "ptd-referenceKey",
  referenceTick: "ptd-referenceTick",
  regionProfile: "ptd-regionProfile",
  reportLine: "ptd-reportLine",
  rowChevron: "ptd-rowChevron",
  rowValue: "ptd-rowValue",
  sectionHeading: "ptd-sectionHeading",
  srOnly: "ptd-srOnly",
  stageLink: "ptd-stageLink",
  stageRow: "ptd-stageRow",
  stageRows: "ptd-stageRows",
  stageTrack: "ptd-stageTrack",
  stages: "ptd-stages",
  state: "ptd-state",
  summary: "ptd-summary",
  summaryAction: "ptd-summaryAction",
  summaryItem: "ptd-summaryItem",
  summaryLabel: "ptd-summaryLabel",
  summaryValue: "ptd-summaryValue",
  switch: "ptd-switch",
  textButton: "ptd-textButton",
  textLink: "ptd-textLink",
  toolbar: "ptd-toolbar",
  toolbarRight: "ptd-toolbarRight",
  topic: "ptd-topic",
  topicGrid: "ptd-topicGrid",
  topicName: "ptd-topicName",
  topicValue: "ptd-topicValue",
  topline: "ptd-topline",
  track: "ptd-track",
  trackFill: "ptd-trackFill",
  tracks: "ptd-tracks",
  workspace: "ptd-workspace",
};

interface Initial { country: string; metric: PreviewMetric; normalized: boolean; domain: string; comparison: string; region: boolean; all: boolean; tab: "overview" | "domains"; chart: "radar" | "bars" }
const TONES: Record<PreviewTone, string> = { lowest: "var(--compare-below-2)", low: "var(--doc-low)", lower: "var(--doc-mid-low)", middle: "var(--doc-mid)", higher: "var(--doc-mid-high)", highest: "var(--doc-high)", unavailable: "var(--data-unavailable)" };
const INKS: Record<PreviewTone, string> = { lowest: "var(--compare-below-2-ink)", low: "var(--doc-low-ink)", lower: "var(--doc-mid-low-ink)", middle: "var(--doc-mid-ink)", higher: "var(--doc-mid-high-ink)", highest: "var(--doc-high-ink)", unavailable: "#111827" };
const COMPARISONS: Partial<Record<PreviewTone, string>> = { lowest: "Much lower", lower: "Lower", middle: "Near average", higher: "Higher", highest: "Much higher" };
const ICONS = { climate: CloudSun, disaster_risk: ShieldCheck, agriculture: Sprout, water: Waves, nature_land: Trees, energy: Zap };
const markStyle = (tone: PreviewTone) => ({ "--mark": TONES[tone] } as CSSProperties);
const position = (value: number, maximum: number) => Math.max(0, Math.min(100, 100 * value / maximum)) + "%";
const number = (value: number | null, metric: PreviewMetric, normalized: boolean) => presentedScore(value, metric, normalized, normalized || metric === "detail" ? "/100" : metric === "coverage" ? "%" : "");
function read(scope: PreviewScope | undefined, metric: PreviewMetric, normalized: boolean) { return scope ? normalized ? scope.measures[metric].normalized : scope.measures[metric].original : null; }
function tone(scope: PreviewScope, metric: PreviewMetric, normalized: boolean) { return normalized ? scope.measures[metric].relativeTone : scope.measures[metric].originalTone; }
function scopeValue(scope: PreviewScope, metric: PreviewMetric, normalized: boolean) {
  const value = read(scope, metric, normalized);
  return value === null ? "—" : metric === "coverage" ? scope.covered + "/" + scope.totalTopics : number(value, metric, normalized);
}
function buildCountryHref(country: PreviewCountry, tab: string, metric: PreviewMetric, normalized: boolean, domain?: string, topic?: string) {
  const params = new URLSearchParams({ tab, metric, scale: normalized ? "normalized" : "raw" });
  if (country.reportId) params.set("report", country.reportId);
  if (domain) params.set("domain", domain);
  if (topic) params.set("topic", topic);
  return "/countries/" + country.iso3 + "?" + params.toString();
}
function DomainIcon({ id }: { id: string }) {
  const Icon = ICONS[id as keyof typeof ICONS] ?? Leaf;
  return <Icon size={18} strokeWidth={1.5} aria-hidden />;
}

export function PolicyDashboard({ countries, initial, embedded = false, actionStages = DEFAULT_ACTION_STAGES }: { countries: PreviewCountry[]; initial: Initial; embedded?: boolean; actionStages?: number[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [countryId, setCountryId] = useState(initial.country);
  const [metric, setMetric] = useState(initial.metric);
  const [normalized, setNormalized] = useState(initial.normalized && initial.metric !== "coverage");
  const [domainId, setDomainId] = useState(initial.domain);
  const [comparisonId, setComparisonId] = useState(initial.comparison);
  const [region, setRegion] = useState(initial.region);
  const [all, setAll] = useState(initial.all);
  const [tab, setTab] = useState(initial.tab);
  const [chart, setChart] = useState(initial.chart);
  const country = countries.find(item => item.iso3 === countryId) ?? countries[0];
  const overviewDomains = [...PREVIEW_DOMAINS.flatMap(id => country.domains.filter(d => d.id === id)), ...country.domains.filter(d => !PREVIEW_DOMAINS.includes(d.id))];
  const comparison = countries.find(item => item.iso3 === comparisonId && item.iso3 !== country.iso3);
  const domain = country.domains.find(item => item.id === domainId);
  const regional = countries.filter(item => !item.demo);
  const domainCatalog = [...new Map((region ? regional : [country]).flatMap(item => item.domains.map(d => [d.id, d] as const))).values()];
  const displayed = all && (region || tab === "domains") ? domainCatalog : PREVIEW_DOMAINS.flatMap(id => domainCatalog.filter(d => d.id === id));
  const showRadar = !region && tab === "overview" && chart === "radar";
  const unit = previewUnit(metric, normalized);
  function countryHref(...args: Parameters<typeof buildCountryHref>) {
    return buildCountryHref(...args) + "&stages=" + actionStages.join(",");
  }
  const regionalHref = "/countries?" + new URLSearchParams({ metric, scale: normalized ? "normalized" : "raw", stages: actionStages.join(",") });
  const maximum = normalized || metric === "detail" || metric === "coverage" ? 100 : Math.max(1, ...displayed.flatMap(d => [
    read(d, metric, false) ?? 0,
    read(comparison?.domains.find(item => item.id === d.id), metric, false) ?? 0,
    d.measures[metric].reference ?? 0,
  ]));

  useEffect(() => {
    const params = new URLSearchParams();
    if (!embedded) params.set("country", country.iso3);
    params.set("metric", metric);
    params.set("scale", normalized ? "normalized" : "raw");
    params.set("tab", tab);
    params.set("chart", chart);
    if (country.reportId && !region) params.set("report", country.reportId);
    if (domainId) params.set("domain", domainId);
    if (comparisonId) params.set("compare", comparisonId);
    if (region && !embedded) params.set("view", "region");
    if (all) params.set("all", "1");
    params.set("stages", actionStages.join(","));
    const pathname = embedded ? region ? "/countries" : "/countries/" + country.iso3 : "/design-preview";
    window.history.replaceState(null, "", BASE_PATH + pathname + "?" + params.toString());
    if (rootRef.current) rootRef.current.dataset.ready = "true";
  }, [country.iso3, country.reportId, metric, normalized, domainId, comparisonId, region, all, tab, chart, embedded, actionStages]);

  function chooseCountry(id: string) {
    if (embedded) {
      const selected = countries.find(row => row.iso3 === id);
      if (selected) assignLocation(countryHref(selected, "overview", metric, normalized));
      return;
    }
    setCountryId(id); setDomainId("");
    if (id === comparisonId) setComparisonId("");
  }
  function selectDomain(id: string) { setDomainId(domainId === id ? "" : id); }
  const domainColorKey = <ScoreColorKey metric={metric} normalized={normalized} />;
  const stages = region ? regional.reduce((sum, row) => ({
    commitment: sum.commitment + row.stages.commitment, planned: sum.planned + row.stages.planned,
    underway: sum.underway + row.stages.underway, delivered: sum.delivered + row.stages.delivered,
    mixed: sum.mixed + row.stages.mixed, other: sum.other + row.stages.other, total: sum.total + row.stages.total,
  }), { commitment: 0, planned: 0, underway: 0, delivered: 0, mixed: 0, other: 0, total: 0 }) : country.stages;
  const stageRows = [
    { id: "commitment", label: "Commitment", value: stages.commitment, tone: "lower" as PreviewTone },
    { id: "planned", label: "Planned action", value: stages.planned, tone: "middle" as PreviewTone },
    { id: "underway", label: "Underway", value: stages.underway, tone: "higher" as PreviewTone },
    { id: "delivered", label: "Output delivered", value: stages.delivered, tone: "highest" as PreviewTone },
    ...(stages.mixed ? [{ id: "mixed", label: "Mixed statement types", value: stages.mixed, tone: "unavailable" as PreviewTone }] : []),
  ];
  const stageMaximum = Math.max(1, ...stageRows.map(item => item.value));
  const actionCount = region ? regional.reduce((sum, row) => sum + row.country.actions, 0) : country.country.actions;
  const totalClaims = region ? regional.reduce((sum, row) => sum + row.country.claims, 0) : country.country.claims;
  const coverageAvailable = country.country.measures.coverage.original !== null;
  function explorerItem(scope: PreviewScope, parentDomain?: string) {
    const value = read(scope, metric, normalized), category = tone(scope, metric, normalized);
    const noAction = metric === "detail" && !normalized && scope.processingComplete && scope.actions === 0 && value === null;
    const relative = normalized || !["detail", "coverage"].includes(metric);
    return {
      id: scope.id, label: scope.label, value, display: scopeValue(scope, metric, normalized), color: TONES[category], ink: INKS[category],
      colorMeaning: value === null ? "" : relative ? (COMPARISONS[category] ?? "Unavailable comparison") + " in the region" :
        ({ lowest: "Very low", low: "Low", lower: "Lower", middle: "Middle", higher: "Higher", highest: "Very high", unavailable: "Unavailable" }[category]) + (metric === "coverage" ? " topic coverage" : " on the reported-stage scale"),
      state: noAction ? "no-action" as const : value === null ? "unavailable" as const : "ready" as const,
      href: countryHref(country, "domains", metric, normalized, parentDomain ?? scope.id, parentDomain ? scope.id : undefined),
    };
  }
  const explorerDomains: ExplorerDomain[] = overviewDomains.map(d => ({ ...explorerItem(d),
    context: metric === "coverage" ? `${d.claims} claims` : d.measures.coverage.original === null ? "Coverage unavailable" : `${d.covered}/${d.totalTopics} topics covered`,
    topics: d.topics.map(topic => explorerItem(topic, d.id)),
  }));

  return <div ref={rootRef} className={styles.preview} data-testid={embedded ? "policy-dashboard" : "design-preview"}>
    {!embedded && <div className={styles.topline}>
      <Link prefetch={false} href="/countries" className={styles.back}><ArrowLeft size={14} aria-hidden /> Policy Tracker</Link>
      <span className={styles.previewLabel}>Design preview</span>
      <a href="/methodology" target="_blank" rel="noreferrer" className={styles.method}>Methodology <ArrowUpRight size={13} aria-hidden /></a>
    </div>}

    <header className={embedded ? "ptd-embeddedHeading" : styles.heading}>
      {!embedded && <div>
        <p className={styles.eyebrow}>Climate & disaster policy</p>
        <h1>{region ? "A regional perspective." : country.name + "."}</h1>
        <p className={styles.reportLine}>{region ? regional.length + " countries" : country.documents + " documents"}
          {!region && <><span aria-hidden> / </span><span title={country.reportTitle}>{country.reportId ? "Saved report" : "Current assessment"}</span></>}
          {!region && country.demo && <span className={styles.state}>Demo data</span>}
          {!region && !country.country.processingComplete && <span className={styles.state}>Partial</span>}
        </p>
      </div>}
      {embedded && <a href="/methodology#comparison" className={styles.method}>Methodology <ArrowUpRight size={13} aria-hidden /></a>}
      <div className={styles.headerActions}>
        {!region && <label className={styles.countrySelect}><span className={styles.srOnly}>Country</span>
          <select value={country.iso3} onChange={event => chooseCountry(event.target.value)} aria-label="Country">
            {countries.map(row => <option key={row.iso3} value={row.iso3}>{row.name}</option>)}
          </select><ChevronDown size={14} aria-hidden />
        </label>}
        <div className={styles.switch} aria-label="Dashboard view">
          <button type="button" aria-pressed={!region} onClick={() => embedded && region ? chooseCountry(country.iso3) : setRegion(false)}>Country</button>
          <button type="button" aria-pressed={region} onClick={() => embedded && !region ? assignLocation(regionalHref) : setRegion(true)}>Region</button>
        </div>
      </div>
    </header>

    {!region && <nav className="ptd-countryNav" aria-label="Country navigation">
      <button type="button" aria-current={tab === "overview" ? "page" : undefined} onClick={() => { setTab("overview"); setDomainId(""); }}><LayoutDashboard size={16} aria-hidden />Overview</button>
      <a href={countryHref(country, "summary", metric, normalized)}><Layers size={16} aria-hidden />Claims</a>
      <button type="button" aria-current={tab === "domains" ? "page" : undefined} onClick={() => setTab("domains")}><Network size={16} aria-hidden />Domains & topics</button>
      <a href={countryHref(country, "targets", metric, normalized)}><Target size={16} aria-hidden />Targets</a>
      <a href={countryHref(country, "figures", metric, normalized)}><FileSpreadsheet size={16} aria-hidden />Reported figures</a>
      <a href={countryHref(country, "position", metric, normalized)}><Scale size={16} aria-hidden />Regional position</a>
      <a href={countryHref(country, "documents", metric, normalized)}><FileText size={16} aria-hidden />Documents <span>{country.documents}</span></a>
    </nav>}

    <div className={styles.summary}>
      <div className={styles.summaryItem}>
        <span className={styles.summaryLabel}>{region ? "Countries compared" : "Topics covered"}</span>
        <div className={styles.summaryValue}>{region ? regional.length : coverageAvailable ? country.country.covered : "—"}
          {!region && <span> / {country.country.totalTopics}</span>}
        </div>
        {!region && <div className={styles.coverage} role="img" aria-label={coverageAvailable ? country.country.covered + " of " + country.country.totalTopics + " topics covered" : "Topic coverage unavailable"}>
          {Array.from({ length: country.country.totalTopics }, (_, i) => <i key={i} data-filled={coverageAvailable && i < country.country.covered} />)}
        </div>}
        {region && <p className={styles.micro}>Selected country reports</p>}
      </div>
      <div className={styles.summaryItem}>
        <span className={styles.summaryLabel}>Action claims</span>
        <div className={styles.summaryValue}>{actionCount}<span> / {totalClaims} claims</span></div>
      </div>
      <div className={styles.summaryAction}>
        <a href={region ? regionalHref + "&view=compare&matrix=" + metric : countryHref(country, "summary", metric, normalized)}>
          Explore {region ? "countries" : "claims"} <ArrowUpRight size={18} aria-hidden />
        </a>
      </div>
    </div>

    <div className={styles.toolbar}>
      <label className={styles.metricSelect}><span className={styles.srOnly}>Measure</span>
        <select aria-label="Measure" value={metric} onChange={event => { const next = event.target.value as PreviewMetric; setMetric(next); if (next === "coverage") setNormalized(false); }}>
          {PREVIEW_METRICS.map(item => <option value={item} key={item}>{PREVIEW_LABELS[item]}</option>)}
        </select><ChevronDown size={15} aria-hidden />
      </label>
      <span className={styles.metricValue} data-testid="selected-metric-value">{region ? "" : scopeValue(country.country, metric, normalized)}
        {!region && metric !== "coverage" && <small>{unit}</small>}
      </span>
      <div className={styles.toolbarRight}>
        {!region && <label className={styles.compareSelect}><span className={styles.srOnly}>Compare country</span>
          <select aria-label="Compare country" value={comparison?.iso3 ?? ""} onChange={event => setComparisonId(event.target.value)}>
            <option value="">Compare country</option>
            {countries.filter(row => row.iso3 !== country.iso3).map(row => <option value={row.iso3} key={row.iso3}>{row.name}</option>)}
          </select>
        </label>}
        {metric !== "coverage" && <div className={styles.switch} aria-label="Metric scale">
          <button type="button" aria-pressed={!normalized} onClick={() => setNormalized(false)}>Original</button>
          <button type="button" aria-pressed={normalized} onClick={() => setNormalized(true)}>Normalized</button>
        </div>}
      </div>
    </div>

    {embedded && <ActionStageSettings pathname={region ? "/countries" : "/countries/" + country.iso3}
      fixed={{ tab, chart, ...(comparisonId ? { compare: comparisonId } : {}) }} metric={metric} scale={normalized ? "normalized" : "raw"} stages={actionStages} />}

    {(region || tab === "overview") && <section className={styles.workspace}>
      <div className={region ? styles.regionProfile : styles.profile}>
        <div className={styles.sectionHeading}><h2>{region ? "Across the region" : "Domain profile"} <span>{displayed.length} of {domainCatalog.length}</span></h2>
          <div className="ptd-chartActions">
            {!region && tab === "overview" && <div className={styles.switch} aria-label="Chart style">
              <button type="button" aria-pressed={chart === "radar"} onClick={() => setChart("radar")}>Radar</button>
              <button type="button" aria-pressed={chart === "bars"} onClick={() => setChart("bars")}>Bars</button>
            </div>}
            <button type="button" className={styles.textButton} onClick={() => { if (!region && tab === "overview") { setTab("domains"); setAll(true); } else setAll(!all); }}>{all && (region || tab === "domains") ? "Show selected" : "All domains"} <ArrowRight size={14} aria-hidden /></button>
          </div>
        </div>
        {region ? <div className={styles.matrixScroll}>
          <table className={styles.matrix}><caption className={styles.srOnly}>{PREVIEW_LABELS[metric]} by country and domain, {normalized ? "Normalized /100" : "Original"}</caption>
            <thead><tr><th scope="col">Country</th>{displayed.map(d => <th scope="col" key={d.id}>{d.label}</th>)}</tr></thead>
            <tbody>{regional.map(row => <tr key={row.iso3}>
              <th scope="row"><button type="button" onClick={() => { chooseCountry(row.iso3); if (!embedded) setRegion(false); }}>{row.name}<ArrowUpRight size={13} aria-hidden /></button></th>
              {displayed.map(d => { const value = row.domains.find(item => item.id === d.id); return <td key={d.id}>
                <button type="button" disabled={!value} style={markStyle(value ? tone(value, metric, normalized) : "unavailable")} onClick={() => { if (embedded) { assignLocation(countryHref(row, "domains", metric, normalized, d.id)); return; } chooseCountry(row.iso3); setDomainId(d.id); setRegion(false); }}
                  aria-label={row.name + ", " + d.label + ", " + (value ? scopeValue(value, metric, normalized) + " " + (metric === "coverage" ? "topics" : unit) : "Unavailable")}>
                  <i aria-hidden />{value ? scopeValue(value, metric, normalized) : "—"}
                </button>
              </td>; })}
            </tr>)}</tbody>
          </table>
          {!regional.length && <p className={styles.micro}>No country reports available for regional comparison.</p>}
        </div> : showRadar ? <DomainRadar country={country.name} peer={comparison?.name} maximum={maximum} unit={unit} metric={metric} normalized={normalized} selected={domainId} onSelect={selectDomain}
          axes={displayed.map(d => ({ id: d.id, label: d.label, value: read(d, metric, normalized),
            peer: read(comparison?.domains.find(item => item.id === d.id), metric, normalized),
            reference: normalized ? d.measures[metric].normalized === null ? null : 50 : d.measures[metric].reference,
          }))} /> : <>
          <div className={styles.chartKey}>
            {comparison ? <><span><i className={styles.countryDot} />{country.name}</span><span><i className={styles.peerDot} />{comparison.name}</span></> :
              <><span>{unit === "%" ? "Share of topics" : unit === "/100" ? "Score /100" : unit}</span><span><i className={styles.referenceKey} />Regional average</span></>}
          </div>
          <div className={styles.axis} aria-hidden><span>0</span><span>{number(maximum / 2, metric, normalized)}</span><span>{number(maximum, metric, normalized)}</span></div>
          <div className={styles.tracks}>
            {displayed.map(d => {
              const value = read(d, metric, normalized), peer = comparison?.domains.find(item => item.id === d.id), peerValue = read(peer, metric, normalized);
              const reference = normalized ? d.measures[metric].normalized === null ? null : 50 : d.measures[metric].reference;
              const category = tone(d, metric, normalized);
              return <button type="button" key={d.id} className={styles.domainRow} style={markStyle(category)}
                aria-expanded={domainId === d.id} aria-controls="preview-domain-detail"
                aria-label={d.label + ", " + country.name + ", " + scopeValue(d, metric, normalized) + " " + (metric === "coverage" ? "topics" : unit) + (comparison ? "; " + comparison.name + ", " + (peer ? scopeValue(peer, metric, normalized) : "Unavailable") : COMPARISONS[category] && (normalized || !["detail", "coverage"].includes(metric)) ? ", " + COMPARISONS[category] + " in the region" : "")}
                onClick={() => selectDomain(d.id)}>
                <span className={styles.domainName}><DomainIcon id={d.id} /><span>{d.label}</span></span>
                <span className={styles.track} aria-hidden>
                  {comparison ? <>
                    {value !== null && peerValue !== null && <i className={styles.connector} style={{ left: position(Math.min(value, peerValue), maximum), width: position(Math.abs(value - peerValue), maximum) }} />}
                    {value !== null && <i className={styles.primaryEndpoint} style={{ left: position(value, maximum) }} />}
                    {peerValue !== null && <i className={styles.peerEndpoint} style={{ left: position(peerValue, maximum) }} />}
                  </> : <>
                    {value !== null && <><i className={styles.trackFill} style={{ width: position(value, maximum) }} /><i className={styles.endpoint} style={{ left: position(value, maximum) }} /></>}
                    {reference !== null && <i className={styles.referenceTick} style={{ left: position(reference, maximum) }} />}
                  </>}
                </span>
                <span className={styles.rowValue}>{scopeValue(d, metric, normalized)}{comparison && <small>{peer ? scopeValue(peer, metric, normalized) : "—"}</small>}</span>
                <ChevronDown size={13} className={styles.rowChevron} aria-hidden />
              </button>;
            })}
          </div>
        </>}
        {(!comparison || region) && !showRadar && domainColorKey}
      </div>

      {!region && <aside className={styles.stages}>
        <div className={styles.sectionHeading}><h2>Reported stages</h2><ArrowDown size={17} aria-hidden /></div>
        <div className={styles.stageRows}>{stageRows.map(row => <div key={row.id} className={styles.stageRow} style={markStyle(row.tone)}>
          <div><span>{row.label}</span><strong>{row.value}</strong></div>
          <div className={styles.stageTrack}><i style={{ width: position(row.value, stageMaximum) }} /></div>
        </div>)}</div>
        <a className={styles.stageLink} href={countryHref(country, "summary", metric, normalized)}>View claims <ArrowUpRight size={15} aria-hidden /></a>
      </aside>}
    </section>}

    {!region && domain && <section id="preview-domain-detail" className={styles.detail} aria-label={domain.label + " topics"}>
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>Explore the evidence</p><h2><DomainIcon id={domain.id} />{domain.label}<span>{domain.topics.length} topics</span></h2></div>
        <button type="button" aria-label="Close domain details" className={styles.closeButton} onClick={() => setDomainId("")}><X size={18} /></button>
      </div>
      <div className={styles.topicGrid}>
        {domain.topics.map(topic => <a key={topic.id} className={styles.topic} href={countryHref(country, "domains", metric, normalized, domain.id, topic.id)} style={markStyle(tone(topic, metric, normalized))}>
          <span className={styles.topicName}>{topic.label}</span>
          <span className={styles.topicValue}>{scopeValue(topic, metric, normalized)}<small>{metric === "coverage" ? "topics" : unit}</small><ArrowUpRight size={15} aria-hidden /></span>
        </a>)}
      </div>
      <a className={styles.textLink} href={countryHref(country, "domains", metric, normalized, domain.id)}>Open domain detail <ArrowRight size={14} aria-hidden /></a>
    </section>}

    {!region && <div className="ptd-explorerPanel">
      {tab === "domains" && <a className={styles.textLink} href={countryHref(country, "domains", metric, normalized) + "&view=topics"}>All topics table <ArrowUpRight size={14} aria-hidden /></a>}
      <DomainExplorer key={country.iso3 + (country.reportId ?? "")} metric={PREVIEW_LABELS[metric] + (normalized ? " · Normalized" : "")}
        colorKey={domainColorKey} unit={metric === "coverage" ? "topics" : unit} fixedScale={normalized || metric === "detail" || metric === "coverage"} domains={explorerDomains} />
    </div>}

    <footer className={styles.footer}><span><Check size={13} aria-hidden /> {country.reportId && !region ? country.reportTitle : "Policy document evidence"}</span><a href={embedded ? "/methodology#claim-points" : countryHref(country, "overview", metric, normalized)}>{embedded ? "Scoring methodology" : "Current dashboard"} <ArrowUpRight size={13} aria-hidden /></a></footer>
    <p className={styles.srOnly} role="status">{region ? "Regional overview" : country.name + " overview"} · {PREVIEW_LABELS[metric]} · {normalized ? "Normalized" : "Original"}{domain && !region ? " · " + domain.label + " selected" : ""}</p>
  </div>;
}
