"use client";

import { ReportLink as Link } from "@/components/report-link";
import { ChevronDown } from "lucide-react";

export interface TabItem {
  id: string;
  href: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
}

/** Link tabs: each tab is a URL, so tabs survive refreshes and can be shared. */
export function Tabs({ items, active, label }: { items: TabItem[]; active: string; label: string }) {
  const current = items.find(item => item.id === active) ?? items[0];
  const tabLink = (t: TabItem) => <Link href={t.href} aria-current={t.id === active ? "page" : undefined}
    className={`flex min-h-11 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${t.id === active ? "border-primary text-primary-ink" : "border-transparent text-muted hover:text-foreground"}`}>
    {t.label}{t.hint}
  </Link>;
  return (
    <nav aria-label={label} className="dashboard-tabs mb-5 border-b border-border">
      <ul className="tabs-wide gap-1">{items.map(t => <li key={t.id}>{tabLink(t)}</li>)}</ul>
      <div className="tabs-compact relative items-center justify-between gap-1">
        <ul className="flex min-w-0 items-center gap-1">
          {items.filter((t,index)=>index<2||t.id===current?.id).map(t=><li key={t.id} className={t.id===current?.id?"min-w-0":"tabs-shortcut"}>{tabLink(t)}</li>)}
        </ul>
        {items.length > 1 && <details key={active} className="shrink-0" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface-2">More <ChevronDown className="size-4" aria-hidden/></summary>
          <ul className="tabs-menu absolute right-0 top-full z-30 mt-2 rounded-xl border border-border bg-surface p-2 shadow-card">
            {items.filter(t=>t.id!==current?.id).map(t=><li key={t.id} className={items.slice(0,2).some(first=>first.id===t.id)?"tabs-overflow-shortcut":""}>
              <Link href={t.href} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">{t.label}{t.hint}</Link>
            </li>)}
          </ul>
        </details>}
      </div>
    </nav>
  );
}
