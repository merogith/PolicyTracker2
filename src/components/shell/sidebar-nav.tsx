"use client";

import { Activity, Globe2, Menu, Network, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { STATIC_DEMO } from "@/lib/static-demo";

export interface SidebarData {
  countries: Array<{ iso3: string; name: string; busy: boolean; failed: boolean }>;
  activeJobs: number;
  failedJobs: number;
  aiMode: "demo" | "missing_key" | "live";
}

function Brand() {
  return (
    <Link href="/countries" className="flex items-center gap-2.5 text-sidebar-ink">
      <span className="grid size-8 place-items-center rounded-lg bg-sidebar-active">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 4h10l4 4v12H5z" strokeLinejoin="round" />
          <path d="M8.5 12.5l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Policy Tracker</span>
    </Link>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: typeof Globe2;
  label: string;
  active: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-sidebar-active text-sidebar-ink" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{label}</span>
      {badge}
    </Link>
  );
}

function Nav({ data, pathname }: { data: SidebarData; pathname: string }) {
  const countryActive = (iso3: string) => pathname === `/countries/${iso3}` || pathname.startsWith(`/countries/${iso3}/`);
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4" aria-label="Main">
      <div className="flex flex-col gap-1">
        <NavItem href="/countries" icon={Globe2} label="Countries" active={pathname === "/countries"} />
        <ul className="ml-5 flex flex-col gap-0.5 border-l border-sidebar-hover pl-2">
          {data.countries.map((c) => (
            <li key={c.iso3}>
              <Link
                href={`/countries/${c.iso3}`}
                aria-current={countryActive(c.iso3) ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                  countryActive(c.iso3) ? "bg-sidebar-active text-sidebar-ink" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{c.iso3}</span>
                <span className="flex-1 truncate">{c.name}</span>
                {c.busy && <span className="pulse size-1.5 rounded-full bg-sky-300" title="Work running" />}
                {c.failed && !c.busy && <span className="size-1.5 rounded-full bg-rose-400" title="Something failed" />}
              </Link>
            </li>
          ))}
          {!STATIC_DEMO && <li>
            <Link
              href="/countries#add"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-ink"
            >
              <Plus className="size-3.5" aria-hidden /> Add country
            </Link>
          </li>}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <NavItem
          href="/taxonomy"
          icon={Network}
          label="Domains & topics"
          active={pathname.startsWith("/taxonomy")}
        />
        <NavItem
          href="/runs"
          icon={Activity}
          label="Runs"
          active={pathname.startsWith("/runs")}
          badge={
            <span className="flex gap-1">
              {data.activeJobs > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-sky-400/20 px-2 text-[11px] text-sky-200 tabular" title="Jobs queued or running">
                  <span className="pulse size-1.5 rounded-full bg-sky-300" />
                  {data.activeJobs}
                </span>
              )}
              {data.failedJobs > 0 && (
                <span className="rounded-full bg-rose-400/20 px-2 text-[11px] text-rose-200 tabular" title="Failed jobs">
                  {data.failedJobs} failed
                </span>
              )}
            </span>
          }
        />
      </div>
      {STATIC_DEMO ? <span className="mt-auto px-3 py-2 text-sm text-amber-100">Read-only snapshot</span> : data.aiMode !== "live" && <Link href="/runs" className="mt-auto px-3 py-2 text-sm text-amber-100 hover:underline">
        {data.aiMode === "demo" ? "Demo mode" : "Analysis setup required"}
      </Link>}
      <Link href="/methodology" className="mt-auto px-3 py-2 text-xs text-sidebar-muted hover:text-sidebar-ink">Methodology</Link>
    </nav>
  );
}

export function SidebarNav({ data }: { data: SidebarData }) {
  const pathname = usePathname();
  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = drawer.current;
    const menuButton = trigger.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpenOn(null); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      menuButton?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Wide screens: fixed sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-sidebar py-5 lg:flex">
        <div className="px-5">
          <Brand />
        </div>
        <Nav data={data} pathname={pathname} />
      </aside>

      {/* Narrow screens: top bar and drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-ink hover:bg-sidebar-hover"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {data.activeJobs > 0 && <span className="pulse size-2 rounded-full bg-sky-300" />}
          <Menu className="size-5" aria-hidden />
          <span className="sr-only">Open menu</span>
        </button>
      </header>
        <dialog ref={drawer} id="mobile-nav" aria-label="Navigation" onCancel={event=>{event.preventDefault();setOpen(false);}} onKeyDown={event=>{
          if(event.key!=="Tab") return;
          const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(element=>element.getClientRects().length);
          const first=controls[0],last=controls.at(-1);
          if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
          else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
        }} onClick={event=>{
          if(event.target===event.currentTarget || (event.target as HTMLElement).closest("a")) setOpen(false);
        }} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/40">
          <aside className="flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-sidebar py-5 shadow-xl">
            <div className="flex items-center justify-between px-5">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-sidebar-ink hover:bg-sidebar-hover">
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close menu</span>
              </button>
            </div>
            <Nav data={data} pathname={pathname} />
          </aside>
        </dialog>
    </>
  );
}
