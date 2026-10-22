"use client";

import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { defaultClaimView, readClaimView, writeClaimView, type ClaimViewState } from "@/lib/claim-view-state";
import { claimDomains, filterClaims, groupClaims, sortClaims, type ClaimGroup, type ClaimSort, type SearchableClaim } from "@/lib/claim-explorer";
import { groupStatementType, statementTypePoints } from "@/lib/statement-types";
import { claimScore } from "@/lib/claim-score";
import { DIMENSION_NAMES, labelOptions, labelName, type LabelDimension } from "@/lib/labels";
import { ClaimDetails, ClaimPoints, FindingEvidence, FindingStage } from "./claim-details";

const dimensions = Object.keys(DIMENSION_NAMES) as LabelDimension[];
export function ClaimExplorer({ rows, domainCatalogue=[], countryOnly=false, targetsOnly=false }: { rows:SearchableClaim[]; domainCatalogue?:Array<{id:string;label:string;enabled:boolean}>; countryOnly?:boolean; targetsOnly?:boolean }) {
  const params = useSearchParams();
  const {search,country,domain,stage,topic,documentId,labeling,labels,includeDemo,page,groupBy,sortBy,descending,expanded} = useMemo(()=>readClaimView(params),[params]);
  function update(patch: Partial<ClaimViewState>, resetPage = true) {
    const url = new URL(window.location.href);
    const previous = readClaimView(url.searchParams);
    url.search = writeClaimView(url.searchParams, {...previous,...(resetPage?{page:1}:{}),...patch}).toString();
    window.history.replaceState(null,"",url);
  }
  const setSearch=(search:string)=>update({search}), setCountry=(country:string)=>update({country});
  const setDomain=(domain:string)=>update({domain,topic:""}), setStage=(stage:string)=>update({stage});
  const setTopic=(topic:string)=>update({topic}), setDocument=(documentId:string)=>update({documentId});
  const setLabeling=(labeling:string)=>update({labeling}), setPage=(page:number)=>update({page},false);
  const setGroupBy=(groupBy:ClaimGroup)=>update({groupBy}), setSortBy=(sortBy:ClaimSort)=>update({sortBy});
  const setDescending=(descending:boolean)=>update({descending}), setIncludeDemo=(includeDemo:boolean)=>update({includeDemo});
  const available=rows.filter(r=>includeDemo||!r.demo);
  const countries=[...new Map(available.map(r=>[r.iso3,{id:r.iso3,label:r.country}])).values()];
  const domains=[...new Map([...domainCatalogue.filter(d=>d.enabled),...available.flatMap(r=>claimDomains(r))].map(d=>[d.id,d])).values()].sort((a,b)=>a.label.localeCompare(b.label));
  const topics=[...new Map(available.filter(r=>!domain||claimDomains(r).some(d=>d.id===domain)).flatMap(r=>r.topics).map(t=>[t.id,t])).values()].sort((a,b)=>a.label.localeCompare(b.label));
  const documents=[...new Set(available.flatMap(r=>r.documents))].sort();
  const filtered=useMemo(()=>sortClaims(filterClaims(rows,{search,country,domain,topic,document:documentId,stage,labels,labeling,targetsOnly,includeDemo}),sortBy,descending),[rows,search,country,domain,topic,documentId,stage,labels,labeling,targetsOnly,includeDemo,sortBy,descending]);
  const groups=useMemo(()=>groupClaims(filtered,groupBy),[filtered,groupBy]);
  const countryCount=new Set(filtered.map(row=>row.iso3)).size;
  const entries=groups.flatMap(group=>group.rows.map(row=>({group,row})));
  const pageSize=10, pageCount=Math.max(1,Math.ceil(entries.length/pageSize)), currentPage=Math.min(page,pageCount);
  const visible=entries.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const active=Boolean(search||country||domain||topic||documentId||stage||labeling||Object.values(labels).some(Boolean)||includeDemo);
  const incomplete=available.filter(r=>r.labeling!=="complete").length;
  const extraCount = [topic,documentId,labeling,...Object.values(labels)].filter(Boolean).length;
  function clear() { update({...defaultClaimView,groupBy,sortBy,descending}); }
  function select(title:string,value:string,change:(value:string)=>void,options:Array<{id:string;label:string}>,all=`All ${title.toLowerCase()}`) {
    return <label className="flex min-w-0 flex-col gap-1 text-xs text-muted"><span>{title}</span><select className="field w-full text-foreground" value={value} onChange={e=>change(e.target.value)}><option value="">{all}</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
  }
  function exportCsv() {
    const cell=(value:string)=>`"${(/^[\t\r\n=+@-]|^\s+[=+@-]/.test(value)?"'":"")+value.replaceAll('"','""')}"`;
    const lines=[["Country","Claim statements","Claim points","Scoring note","Source quotation matched","Home domains","Related domains","Extraction domains","Domain filter scope","Topics","Documents",...dimensions.map(d=>DIMENSION_NAMES[d]),"Label coverage","Source classifications and evidence","Demo"],...filtered.map(r=>[
      r.country,r.units.map(u=>u.text).join("\n"),String(claimScore(r.units).points??""),claimScore(r.units).reason,claimScore(r.units).sourceMatched?"Yes":"No",r.domains.map(d=>d.label).join("; "),r.relatedDomains.map(d=>d.label).join("; "),r.extractionDomains.map(d=>d.label).join("; "),"home",r.topics.map(t=>t.id).join("; "),r.documents.join("; "),
      ...dimensions.map(d=>r.labels[d].map(labelName).join("; ")),r.labeling,JSON.stringify(r.classifications),r.demo?"Yes":"No",
    ])];
    const url=URL.createObjectURL(new Blob(["\uFEFF",lines.map(line=>line.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");a.href=url;a.download=targetsOnly?"policy-tracker-targets.csv":"policy-tracker-claims.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  return <section className="flex min-w-0 flex-col gap-4" aria-label={targetsOnly?"Targets":"Searchable claims"}>
    <h2 className="sr-only">{targetsOnly?"Targets":"Claims"}</h2>
    {incomplete>0&&<p className="text-xs text-muted">{incomplete} claims have incomplete labels. <Link href="/methodology#labels" className="text-primary-ink hover:underline">About labels</Link></p>}
    <div className={`grid grid-cols-2 gap-3 ${countryOnly?"xl:grid-cols-[2fr_1fr_1fr]":"xl:grid-cols-4"}`}>
      <label className="col-span-2 flex flex-col gap-1 text-xs text-muted xl:col-span-1"><span>Search</span><span className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={targetsOnly?"Search targets…":"Search claims…"} className="field w-full pl-9 text-foreground"/></span></label>
      {!countryOnly&&select("Countries",country,setCountry,countries)}
      {select("Domains",domain,setDomain,domains)}
      {select("Statement type",stage,setStage,[...labelOptions("statement_type",available.flatMap(row=>row.labels.statement_type)).map(type=>({id:type.id,label:`${type.label} · ${statementTypePoints(type.id)??"unresolved"} ${statementTypePoints(type.id)===1?"point":"points"}`})),{id:"mixed",label:"Mixed statement types"},{id:"__unclassified",label:"No statement type available"}],"All statement types")}
    </div>
    <details className="border-b border-border pb-3">
      <summary className="w-fit cursor-pointer py-1 text-sm text-muted hover:text-foreground">More filters{extraCount>0&&<span className="ml-2 font-medium text-primary-ink">· {extraCount} active</span>}</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {select("Topics",topic,setTopic,topics)}
        {select("Documents",documentId,setDocument,documents.map(id=>({id,label:id})))}
        {dimensions.filter(d=>d!=="statement_type").map(d=><div key={d}>{select(DIMENSION_NAMES[d],labels[d]??"",v=>update({labels:{...labels,[d]:v}}),[...labelOptions(d,available.flatMap(row=>row.labels[d])),{id:"__unlabeled",label:"Not stated / not extracted"}],`Any ${DIMENSION_NAMES[d].toLowerCase()}`)}</div>)}
        {select("Label coverage",labeling,setLabeling,[{id:"complete",label:"All source findings classified"},{id:"partial",label:"Some source findings classified"},{id:"unavailable",label:"Not classified"}],"Any coverage")}
      </div>
      <Link href="/methodology#labels" className="mt-3 inline-block text-xs text-primary-ink hover:underline">About filters and labels</Link>
    </details>
    <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
      {select("Group by",groupBy==="none"?"":groupBy,v=>setGroupBy((v||"none") as ClaimGroup),[
        ...(!countryOnly?[{id:"country",label:"Country"}]:[]),{id:"domain",label:"Domain"},{id:"topic",label:"Topic"},{id:"document",label:"Document"},...dimensions.map(d=>({id:d,label:DIMENSION_NAMES[d]})),
      ],"No grouping")}
      {select("Sort by",sortBy==="title"?"":sortBy,v=>setSortBy((v||"title") as ClaimSort),[
        ...(!countryOnly?[{id:"country",label:"Country"}]:[]),{id:"points",label:"Claim points"},{id:"sources",label:"Number of source documents"},...dimensions.map(d=>({id:d,label:DIMENSION_NAMES[d]})),
      ],"Claim title")}
      <label className="mb-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={descending} onChange={e=>{setDescending(e.target.checked);setPage(1);}}/>Descending</label>
      <div className="ml-auto flex items-center gap-3"><button type="button" onClick={exportCsv} disabled={!filtered.length} className="btn"><Download className="size-4" aria-hidden/>Export CSV</button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-muted" aria-live="polite">{filtered.length} {targetsOnly?(filtered.length===1?"target":"targets"):(filtered.length===1?"claim":"claims")}{!countryOnly&&` across ${countryCount} ${countryCount===1?"country":"countries"}`}{groupBy!=="none"&&` · ${groups.length} groups`}</p>{active&&visible.length>0&&<button onClick={clear} type="button" className="text-primary-ink hover:underline">Clear filters</button>}</div>
    {groupBy!=="none"&&<p className="text-xs text-muted">Claims may appear in more than one group.</p>}
    {rows.some(r=>r.demo)&&<label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={includeDemo} onChange={e=>{setIncludeDemo(e.target.checked);setPage(1);}}/>Include demo data</label>}
    {visible.length?<div className="rounded-xl border border-border bg-surface px-3 sm:px-5">{visible.map(({row,group},index)=>{
      const first=row.units[0],citations=[...new Map(row.units.flatMap(u=>u.citations).map(c=>[c.id,c])).values()];
      return <div key={`${group.key}:${row.id}`}>
        {groupBy!=="none"&&(index===0||visible[index-1].group.key!==group.key)&&<h3 className="border-b border-border py-3 text-sm font-semibold">{group.label} <span className="font-normal text-muted">({group.rows.length})</span></h3>}
        <article className="border-b border-border py-3 last:border-0">
          <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted">
            {!countryOnly&&<Link href={`/countries/${row.iso3}?tab=summary`} className="font-medium text-primary-ink hover:underline">{row.country}</Link>}
            {row.demo&&<span>Demo</span>}{row.domains.map(d=><Link key={d.id} href={`/countries/${row.iso3}?tab=domains&domain=${encodeURIComponent(d.id)}`} className="hover:underline">{d.label}</Link>)}
            {!row.topics.length&&<span>Outside assessed topics</span>}
            {row.labeling!=="complete"&&<span>{row.labeling==="partial"?"Partial labels":"Labels pending"}</span>}
          </div>
          <ClaimDetails title={first.title} summary={first.summary} text={first.text} open={expanded.includes(`${group.key}:${row.id}`)} onOpenChange={open=>{
            const key=`${group.key}:${row.id}`;
            const current=readClaimView(new URLSearchParams(window.location.search)).expanded;
            if(current.includes(key)!==open) update({expanded:open?[...current,key]:current.filter(id=>id!==key)},false);
          }} stage={<><FindingStage kind={groupStatementType(row.units)}/><ClaimPoints score={claimScore(row.units)}/></>} sourceCount={row.documents.length} citationCount={citations.length} relatedCount={row.units.length-1}>
            <div className="flex flex-wrap gap-2">{row.topics.map(t=><Link key={t.id} href={`/countries/${row.iso3}?tab=domains&topic=${encodeURIComponent(t.id)}`} className="rounded bg-primary-soft px-2 py-1 text-xs text-primary-ink hover:underline">{t.label}</Link>)}</div>
            {row.units.map((unit,index)=><div key={`${unit.domainId}:${unit.path}`} className="flex flex-col gap-3">
              {index>0&&<><FindingStage kind={groupStatementType([unit])}/>{unit.title&&<h3 className="text-sm font-semibold">{unit.title}</h3>}<p className="text-sm leading-relaxed">{unit.text}</p></>}
              <FindingEvidence unit={unit} iso3={row.iso3}/>
            </div>)}
          </ClaimDetails>
        </article>
      </div>;
    })}</div>:<div className="rounded-xl border border-border bg-surface p-8 text-center"><p className="font-medium">{active?`No ${targetsOnly?"targets":"claims"} match your filters`:`No ${targetsOnly?"targets":"claims"} available`}</p>{active&&<button type="button" onClick={clear} className="mt-3 text-sm text-primary-ink hover:underline">Clear filters</button>}</div>}
    {entries.length>pageSize&&<nav aria-label="Claims pagination" className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{(currentPage-1)*pageSize+1}–{Math.min(currentPage*pageSize,entries.length)} of {entries.length} {groupBy==="none"?"claims":"group entries"}</span><div className="flex items-center gap-3"><button type="button" onClick={()=>setPage(currentPage-1)} disabled={currentPage===1} aria-label="Previous claims page" className="btn"><ChevronLeft className="size-4"/></button><span>{currentPage} / {pageCount}</span><button type="button" onClick={()=>setPage(currentPage+1)} disabled={currentPage===pageCount} aria-label="Next claims page" className="btn"><ChevronRight className="size-4"/></button></div></nav>}
  </section>;
}
