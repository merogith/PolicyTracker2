"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { useId, useMemo, useState } from "react";
import { CONDITIONALITY } from "@/lib/colors";
import type { CountryOverview } from "@/lib/overview";
import { groupReportedFigures } from "@/lib/reported-figures";

export interface RegionalFiguresRow {
  iso3: string;
  country: string;
  demo: boolean;
  figures: CountryOverview["figures"];
}
interface Props { rows: RegionalFiguresRow[]; domains: Array<{ id: string; label: string }>; countryOnly?: boolean; }
const conditionLabel = (value: string) => CONDITIONALITY[value]?.label ?? value;

/** Keep source text intact and prevent spreadsheet applications from evaluating exported cells. */
function csvCell(value: string) {
  const safe = /^[\t\r\n=+@-]|^\s+[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function RegionalFigures({ rows, domains, countryOnly = false }: Props) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [domain, setDomain] = useState("");
  const [condition, setCondition] = useState("");
  const [includeDemo, setIncludeDemo] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const availableRows = useMemo(() => rows.filter(row => includeDemo || !row.demo), [rows, includeDemo]);
  const allFigures = useMemo(() => availableRows.flatMap(row => row.figures.map((figure, index) => ({
    ...figure, iso3: row.iso3, country: row.country, demo: row.demo, key: `${row.iso3}-${index}`,
  }))), [availableRows]);
  const filtered = useMemo(() => {
    const query = search.toLocaleLowerCase().trim();
    return allFigures.filter(figure => (!country || figure.iso3 === country)
      && (!domain || figure.domains.some(item => item.id === domain))
      && (!condition || figure.conditionality === condition)
      && (!query || [figure.country, figure.iso3, figure.finding, figure.valueAsStated, figure.unit, figure.period,
        ...figure.documents, ...figure.domains.map(item => item.label)].filter(Boolean).join(" ").toLocaleLowerCase().includes(query)));
  }, [allFigures, country, domain, condition, search]);
  const groups = useMemo(() => groupReportedFigures(filtered), [filtered]);
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = groups.slice(start, start + pageSize);
  const demoCount = rows.filter(row => row.demo).length;
  const filtersActive = Boolean(search || country || domain || condition || includeDemo);
  const conditions = [...new Set(allFigures.map(figure => figure.conditionality))].sort();

  function clearFilters() {
    setSearch(""); setCountry(""); setDomain(""); setCondition(""); setIncludeDemo(false); setPage(1);
  }
  function exportCsv() {
    const headers = ["Country", "ISO3", "Demo data", "Statement", "Value as stated", "Unit", "Period", "Conditionality", "Domains", "Documents"];
    const lines = filtered.map(figure => [figure.country, figure.iso3, figure.demo ? "Yes" : "No", figure.finding,
      figure.valueAsStated, figure.unit ?? "", figure.period ?? "", conditionLabel(figure.conditionality),
      figure.domains.map(item => item.label).join("; "), figure.documents.join("; ")]);
    const blob = new Blob(["\uFEFF", [headers, ...lines].map(line => line.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `policy-tracker-reported-figures-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <section aria-labelledby={`${id}-title`} className="flex min-w-0 flex-col gap-4">
    <h2 id={`${id}-title`} className="sr-only">Reported figures</h2>
    <div className={`grid grid-cols-2 items-center gap-2 ${countryOnly?"xl:grid-cols-[minmax(12rem,1fr)_14rem]":"xl:grid-cols-[minmax(12rem,1fr)_11rem_14rem]"}`}>
      <label className="relative col-span-2 xl:col-span-1" htmlFor={`${id}-search`}>
        <span className="sr-only">Search reported figures</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden/>
        <input id={`${id}-search`} type="search" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Search figures…" className="field w-full pl-9"/>
      </label>
      {!countryOnly&&<label htmlFor={`${id}-country`}><span className="sr-only">Country</span>
        <select id={`${id}-country`} value={country} onChange={event=>{setCountry(event.target.value);setPage(1);}} className="field w-full"><option value="">All countries</option>{availableRows.map(row=><option key={row.iso3} value={row.iso3}>{row.country}{row.demo?" (demo)":""}</option>)}</select>
      </label>}
      <label htmlFor={`${id}-domain`}><span className="sr-only">Domain</span>
        <select id={`${id}-domain`} value={domain} onChange={event=>{setDomain(event.target.value);setPage(1);}} className="field w-full"><option value="">All domains</option>{domains.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>
      </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted" aria-live="polite">{filtered.length} {filtered.length===1?"figure":"figures"} · {groups.length} {groups.length===1?"statement":"statements"}{includeDemo&&<span className="ml-2 text-warn-ink">Includes demo data</span>}</p>
      <div className="flex items-center gap-3">{filtersActive&&<button type="button" onClick={clearFilters} className="text-primary-ink hover:underline">Clear filters</button>}
        <button type="button" onClick={exportCsv} disabled={filtered.length===0} className="btn"><Download className="size-4" aria-hidden/>Export CSV</button>
      </div>
    </div>
    <details className="text-sm">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-muted hover:text-foreground [&::-webkit-details-marker]:hidden"><SlidersHorizontal className="size-4" aria-hidden/>More filters{condition&&<span className="text-primary-ink">· {conditionLabel(condition)}</span>}</summary>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-condition`}>Conditionality<select id={`${id}-condition`} value={condition} onChange={event=>{setCondition(event.target.value);setPage(1);}} className="field"><option value="">All conditions</option>{conditions.map(value=><option key={value} value={value}>{conditionLabel(value)}</option>)}</select></label>
        {demoCount>0&&<label className="flex min-h-10 items-center gap-2 text-sm text-muted"><input type="checkbox" checked={includeDemo} onChange={event=>{setIncludeDemo(event.target.checked);setCountry("");setPage(1);}} className="accent-primary"/>Include demo data</label>}
      </div>
    </details>
    {groups.length===0?<div className="py-10 text-center"><p className="font-medium">{allFigures.length===0?"No reported figures yet":"No figures match these filters"}</p>{filtersActive&&<button type="button" onClick={clearFilters} className="mt-3 text-sm text-primary-ink hover:underline">Clear filters</button>}</div>:
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">{visible.map(group=>{
        const groupDomains=[...new Map(group.figures.flatMap(figure=>figure.domains).map(item=>[item.id,item])).values()];
        return <article key={group.key} className="min-w-0" aria-label={`Statement from ${group.country}`}>
          <div className="px-4 pt-4 sm:px-5">
            <details className="group/statement">
              <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden"><span className="min-w-0 flex-1 line-clamp-3 text-sm leading-relaxed group-open/statement:line-clamp-none">{group.finding}</span><ChevronDown className="mt-1 size-4 shrink-0 text-muted group-open/statement:rotate-180" aria-hidden/></summary>
            </details>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><Link href={`/countries/${group.iso3}`} className="font-medium text-primary-ink hover:underline">{group.country}</Link>{group.demo&&<span className="text-warn-ink">Demo</span>}{groupDomains.map(item=><Link key={item.id} href={`/countries/${group.iso3}?tab=domains&domain=${encodeURIComponent(item.id)}`} className="hover:text-primary-ink hover:underline">{item.label}</Link>)}</div>
          </div>
          <div className="overflow-x-auto p-4 sm:px-5" role="region" aria-label={`Figures for ${group.finding.slice(0,80)}`} tabIndex={0}>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Values and sources for this statement</caption>
              <thead className="text-xs text-muted"><tr>{["Value as stated","Period","Condition","Documents"].map(heading=><th key={heading} scope="col" className="border-b border-border px-3 py-2 first:pl-0 last:pr-0 font-medium">{heading}</th>)}</tr></thead>
              <tbody>{group.figures.map(figure=><tr key={figure.key} className="border-b border-border/60 align-top last:border-0">
                <td className="w-[36%] px-3 py-3 pl-0 font-medium tabular">{figure.valueAsStated}{figure.unit&&!figure.valueAsStated.includes(figure.unit)&&<span className="block text-xs font-normal text-muted">{figure.unit}</span>}</td>
                <td className="w-[20%] px-3 py-3 tabular">{figure.period||<span className="text-muted">Not stated</span>}</td>
                <td className={`w-[24%] px-3 py-3 text-xs ${figure.conditionality==="conditional"?"text-warn-ink":"text-muted"}`}>{conditionLabel(figure.conditionality)}</td>
                <td className="px-3 py-3 pr-0"><div className="flex flex-wrap gap-2">{figure.documents.length>0?figure.documents.map(documentId=><Link key={documentId} href={`/countries/${figure.iso3}?tab=${encodeURIComponent(documentId)}`} className="text-xs text-primary-ink hover:underline">{documentId}</Link>):<span className="text-xs text-muted">No source linked</span>}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
        </article>;
      })}</div>}
    {groups.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">Statements {start+1}–{Math.min(start+pageSize,groups.length)} of {groups.length}</p>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-muted" htmlFor={`${id}-page-size`}>Per page<select id={`${id}-page-size`} value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1);}} className="field"><option value={10}>10</option><option value={25}>25</option></select></label>
        <nav aria-label="Figures pagination" className="flex items-center gap-2"><button type="button" onClick={()=>setPage(currentPage-1)} disabled={currentPage===1} aria-label="Previous figures page" className="btn p-2"><ChevronLeft className="size-4" aria-hidden/></button><span className="tabular">{currentPage} / {pageCount}</span><button type="button" onClick={()=>setPage(currentPage+1)} disabled={currentPage===pageCount} aria-label="Next figures page" className="btn p-2"><ChevronRight className="size-4" aria-hidden/></button></nav>
      </div>
    </div>}
    <details className="text-sm text-muted"><summary className="w-fit cursor-pointer">About these figures</summary><p className="mt-2 max-w-3xl leading-relaxed">Values retain their stated units, periods, and conditions. <Link href="/methodology#labels" className="text-primary-ink hover:underline">Methodology</Link></p></details>
  </section>;
}
