import { History } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "./action-button";

export function ReportMenu({ iso3, reports, mainReportId, viewedReportId, exportHref }: {
  iso3: string; reports: Array<{ id: string; title: string; createdAt: Date }>;
  mainReportId: string | null; viewedReportId?: string; exportHref?:string;
}) {
  return <details className="relative">
    <summary className="btn list-none cursor-pointer"><History className="size-3.5" aria-hidden /> Reports <span className="text-muted">{reports.length}</span></summary>
    <div className="absolute left-0 z-30 mt-2 max-h-96 w-[min(23rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-surface p-2 shadow-lg sm:right-0 sm:left-auto">
      {exportHref&&<a href={exportHref} className="mb-1 block border-b border-border px-3 py-2 text-sm text-primary-ink hover:underline">Export current report (JSON)</a>}
      {!reports.length && <p className="p-3 text-sm text-muted">Your first report is saved when analysis finishes.</p>}
      {reports.map(report => <div key={report.id} className={`flex items-center gap-3 rounded-lg p-3 ${viewedReportId === report.id ? "bg-surface-2" : ""}`}>
        <Link href={`/countries/${iso3}?report=${report.id}`} className="min-w-0 flex-1 hover:text-primary-ink">
          <p className="text-sm font-medium">{report.title}</p>
          <p className="mt-1 text-xs text-muted">{report.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
        </Link>
        {mainReportId === report.id ? <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary-ink">Main</span>
          : <ActionButton url={`/api/countries/${iso3}/reports`} method="PATCH" body={{ reportId: report.id }} label="Use as main" size="sm" redirectTo={`/countries/${iso3}`} />}
      </div>)}
    </div>
  </details>;
}
