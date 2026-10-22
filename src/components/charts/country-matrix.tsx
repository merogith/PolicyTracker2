"use client";

import { useEffect, useRef, useState } from "react";
import { ReportLink as Link } from "@/components/report-link";
import { processingLabel, type DocumentationDashboard } from "@/lib/documentation-score";
import { documentationEmptyLabel } from "@/lib/documentation-stage";
import type { Domain } from "@/lib/taxonomy";
import { buildRegionalReferences, DEFAULT_ACTION_STAGES, deviationBand, isCountMetric, metricComplete, formatMetric, metricLabel, metricQuery, metricUnit, metricValue, normalizedMetric, type DashboardMetric, type MetricScale } from "@/lib/dashboard-metrics";
import { compareCohort } from "@/lib/regional-dashboard";
import { DocumentationLegend, metricTone } from "./documentation-dashboard";
import { ComparisonBars } from "./comparison-bars";


export interface MatrixRow { iso3: string; name: string; documents: number; dashboard: DocumentationDashboard }

export function CountryDomainMatrix({ rows, domains, mode, scale = "raw", stages = DEFAULT_ACTION_STAGES }: {
  rows: MatrixRow[]; domains: Domain[]; mode: DashboardMetric; scale?: MetricScale; stages?: number[];
}) {
  const [focusedDomain, setFocusedDomain] = useState("");
  const focusPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focusedDomain) focusPanel.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [focusedDomain]);
  const activeDomains = domains.filter(domain => domain.enabled);
  const countries = rows.filter(row => !row.dashboard.demo);
  const normalized = scale === "normalized", count = isCountMetric(mode);
  const references = buildRegionalReferences(countries.map(row => row.dashboard), mode);
  const query = metricQuery(mode, scale, stages);
  const selected = activeDomains.find(domain => domain.id === focusedDomain);
  const unit = metricUnit(mode, scale);
  const cells = (domainId: string) => countries.map(row => {
    const d = row.dashboard.domains.find(domain => domain.id === domainId);
    const raw = d ? metricValue(d, mode) : null;
    const value = d ? normalized ? normalizedMetric(d, mode, references.domains[domainId]) : raw : null;
    const complete = !!d && metricComplete(d,mode);
    const band = deviationBand(complete?raw:null,references.domains[domainId]);
    return {
      id: row.iso3, label: row.name, raw, value, complete, band,
      color: normalized || count ? `var(--compare-${band.tone})` : `var(--doc-${metricTone(value, mode)})`,
      provisional: !complete,
      href: `/countries/${row.iso3}?tab=domains&domain=${encodeURIComponent(domainId)}&${query}`,
      detail: value === null ? d && mode === "detail" && !normalized ? documentationEmptyLabel(d.score)
        : d && !d.processingComplete ? processingLabel(d) : "Not assessed"
        : normalized ? `Raw: ${formatMetric(raw,metricUnit(mode))}${metricUnit(mode)}`
        : [mode === "coverage" ? `${d!.topicsAddressed}/${d!.topicCount} home topics`
          : mode === "responses" ? `${d!.topicsWithResponses}/${d!.topicCount} home topics` : "",
          !complete ? d && !d.processingComplete ? processingLabel(d) : "Provisional" : ""].filter(Boolean).join(" · "),
    };
  });
  const focusedRows = selected ? cells(selected.id) : [];
  const comparison = compareCohort(focusedRows.map(row => ({
    iso3: row.id, value: row.value, complete: row.complete, demo: false, cohortKey: "region",
  })), "region");
  const cell = (row: ReturnType<typeof cells>[number], domainLabel: string) => {
    const palette = normalized || count ? "compare" : "doc";
    const tone = normalized || count ? row.band.tone : metricTone(row.value, mode);
    return <Link href={row.href}
      aria-label={`${row.label}, ${domainLabel}: ${row.value === null ? row.detail : `${formatMetric(row.value,unit)}${unit} ${metricLabel(mode).toLowerCase()}`}.${row.value !== null && row.detail ? ` ${row.detail}.` : ""} Open evidence.`}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-primary"
      title={normalized || count ? row.band.label : `${metricLabel(mode)}: ${formatMetric(row.value,unit)}${unit}`}
      style={{ background: `var(--${palette}-${tone}-soft)`, color: `var(--${palette}-${tone}-ink)` }}>
      <span className="text-lg font-semibold tabular">{formatMetric(row.value,unit)}</span>
      {row.detail && <span className="text-center text-[13px] leading-5">{row.detail}</span>}
    </Link>;
  };

  return <figure className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm font-medium">{metricLabel(mode)}{unit && ` (${unit})`}</p>
      <label className="flex w-full flex-col gap-1.5 text-xs font-medium text-muted sm:w-72">
        Focus on a domain
        <select className="field w-full" value={selected?.id ?? ""} onChange={event => setFocusedDomain(event.target.value)}>
          <option value="">All domains</option>
          {activeDomains.map(domain => <option key={domain.id} value={domain.id}>{domain.label}</option>)}
        </select>
      </label>
    </div>
    {selected && <section ref={focusPanel} className="scroll-mt-4 rounded-xl border border-border p-4 sm:p-5" aria-label={`${selected.label} country comparison`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">{selected.label}</h3>
        <button type="button" className="btn btn-sm" onClick={() => setFocusedDomain("")}>Show all domains</button>
      </div>
      <ComparisonBars rows={focusedRows} average={normalized && comparison.mean !== null ? 50 : comparison.mean} unit={unit}
        maximum={count && !normalized ? Math.max(1, ...focusedRows.map(row => row.value ?? 0)) : 100}/>

    </section>}
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full border-separate border-spacing-x-2 border-spacing-y-1 text-sm">
        <caption className="sr-only">{metricLabel(mode)}{unit && ` (${unit})`} by domain and country. Select a domain for a focused comparison.</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-2/5 bg-surface py-3 pr-4 text-left font-medium text-muted">Domain</th>
            {countries.map(row => <th key={row.iso3} scope="col" className="min-w-32 bg-surface px-2 py-3 text-center font-medium">
              <Link href={`/countries/${row.iso3}?tab=overview&${query}`} className="hover:text-primary-ink hover:underline">{row.name}</Link>
              <span className="mt-1 block text-xs font-normal text-muted">{row.documents} sources</span>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {activeDomains.map(domain => <tr key={domain.id} className="group">
            <th scope="row" className="sticky left-0 bg-surface pr-4 text-left font-normal group-hover:bg-surface-2">
              <button type="button" aria-pressed={selected?.id === domain.id}
                onClick={() => setFocusedDomain(selected?.id === domain.id ? "" : domain.id)}
                className={`w-full rounded-md py-3 text-left font-medium hover:text-primary-ink ${selected?.id === domain.id ? "text-primary-ink" : ""}`}>
                {domain.label}
              </button>
            </th>
            {cells(domain.id).map(row => <td key={row.id} className="p-0">{cell(row, domain.label)}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    <ul className="flex flex-col gap-5 sm:hidden" aria-label="Domain comparisons">
      {activeDomains.map(domain => <li key={domain.id} className="border-b border-border pb-4">
        <button type="button" onClick={() => setFocusedDomain(domain.id)} className="mb-3 py-1 text-left text-sm font-medium text-primary-ink">{domain.label} →</button>
        <div className="grid grid-cols-2 gap-2">{cells(domain.id).map(row => <div key={row.id}>
          <p className="mb-1 text-xs font-medium">{row.label}</p>{cell(row, domain.label)}
        </div>)}</div>
      </li>)}
    </ul>
    {countries.length === 0 && <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">No non-demo results yet. Add source documents to compare countries.</p>}
    <DocumentationLegend metric={mode} scale={scale}/>
    <figcaption className="text-xs text-muted">Select a value to open its evidence. A dash means unavailable.</figcaption>
  </figure>;
}
