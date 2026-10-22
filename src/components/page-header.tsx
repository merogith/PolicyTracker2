import { ChevronRight } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  crumbs,
  title,
  meta,
  actions,
}: {
  crumbs?: Crumb[];
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-3 flex flex-col gap-2">
      {crumbs && (crumbs.length > 1 || crumbs.some(crumb=>crumb.href)) && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-primary-ink hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {meta && <div className="flex flex-wrap items-center gap-2 text-sm text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2 [&_.btn]:min-h-9">{actions}</div>}
      </div>
    </header>
  );
}

/** A small labelled fact in a page header. */
export function Fact({ icon: Icon, children, tone }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; tone?: "ok" | "warn" | "bad" | "primary" }) {
  const toneClass =
    tone === "ok"
      ? "bg-ok-soft text-ok-ink"
      : tone === "warn"
        ? "bg-warn-soft text-warn-ink"
        : tone === "bad"
          ? "bg-bad-soft text-bad-ink"
          : tone === "primary"
            ? "bg-primary-soft text-primary-ink"
            : "bg-surface-2 text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}
