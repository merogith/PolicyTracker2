"use client";

import NextLink from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";

const ReportContext = createContext<{ iso3: string; id: string } | null>(null);
export function ReportProvider({ iso3, id, children }: { iso3: string; id?: string; children: ReactNode }) {
  return <ReportContext.Provider value={id ? { iso3, id } : null}>{children}</ReportContext.Provider>;
}

export function ReportInput() {
  const report = useContext(ReportContext);
  return report ? <input type="hidden" name="report" value={report.id} /> : null;
}

/** Keep navigation and evidence links inside the report being viewed. */
export function ReportLink(props: ComponentProps<typeof NextLink>) {
  const report = useContext(ReportContext);
  let href = props.href;
  if (report && typeof href === "string" && (href === `/countries/${report.iso3}` || href.startsWith(`/countries/${report.iso3}?`) || href.startsWith(`/countries/${report.iso3}/`))) {
    const url = new URL(href, "http://report.local");
    if (!url.searchParams.has("report")) url.searchParams.set("report", report.id);
    href = `${url.pathname}${url.search}${url.hash}`;
  }
  return <NextLink {...props} href={href} />;
}
