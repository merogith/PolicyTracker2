import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ReportLink as Link } from "@/components/report-link";
import type { Page } from "@/generated/prisma/client";
import { locateQuote } from "@/lib/analysis/verify";

function Highlighted({ text, ranges }: { text: string; ranges: Array<[number, number]> }) {
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    parts.push(text.slice(at, s));
    parts.push(
      <mark key={i} id={i === 0 ? "quote" : undefined} className="rounded-sm bg-mark px-0.5 text-foreground">
        {text.slice(s, e)}
      </mark>,
    );
    at = e;
  });
  parts.push(text.slice(at));
  return <>{parts}</>;
}

/** One page of a document's stored text, with the selected quote highlighted. */
export function PageViewer({
  pages,
  pageNumber,
  quote,
  basePath,
  pdfUrl,
}: {
  pages: Page[];
  pageNumber: number;
  quote: string | null;
  basePath: string;
  pdfUrl: string;
}) {
  const page = pages.find((p) => p.page === pageNumber) ?? pages[0];
  if (!page) return <p className="text-sm text-muted">No pages extracted yet.</p>;
  const ranges = quote ? locateQuote(page.text, quote) : [];
  const prev = pages.find((p) => p.page === page.page - 1);
  const next = pages.find((p) => p.page === page.page + 1);

  return (
    <section id="viewer" className="panel flex scroll-mt-20 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-1">
          {prev ? (
            <Link href={`${basePath}?page=${prev.page}#viewer`} className="btn btn-ghost btn-sm" aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm opacity-40" aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
          <span className="font-semibold tabular">
            Page {page.page} <span className="font-normal text-muted">of {pages.length}</span>
          </span>
          {next ? (
            <Link href={`${basePath}?page=${next.page}#viewer`} className="btn btn-ghost btn-sm" aria-label="Next page">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm opacity-40" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
          {page.label && page.label !== String(page.page) && <span className="text-xs text-muted">printed {page.label}</span>}
        </div>
        <a href={`${pdfUrl}#page=${page.page}`} target="_blank" rel="noreferrer" className="btn btn-sm">
          <ExternalLink className="size-3.5" aria-hidden /> PDF at this page
        </a>
      </header>
      <div className="flex flex-col gap-3 px-5 py-4">
        {quote && ranges.length > 0 && <p className="text-xs text-muted">Selected quotation highlighted</p>}
        {quote && ranges.length === 0 && (
          <p className="rounded-md bg-bad-soft px-2.5 py-1.5 text-xs text-bad-ink">This quote was not found on this page: “{quote}”</p>
        )}
        {page.disposition === "unreadable" ? (
          <p className="rounded-md bg-warn-soft px-2.5 py-1.5 text-sm text-warn-ink">This page has no text layer (a scanned image?), so it was not analysed.</p>
        ) : (
          <pre className="max-h-[68vh] overflow-auto font-sans text-[15px] leading-7 whitespace-pre-wrap">
            <Highlighted text={page.text} ranges={ranges} />
          </pre>
        )}
      </div>
      <nav aria-label="Pages" className="flex flex-wrap gap-1 border-t border-border bg-surface-2 px-4 py-2.5">
        {pages.map((p) => (
          <Link
            key={p.page}
            href={`${basePath}?page=${p.page}#viewer`}
            aria-current={p.page === page.page ? "page" : undefined}
            title={p.disposition === "unreadable" ? `Page ${p.page}: no text` : `Page ${p.page}`}
            className={`min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs tabular transition-colors ${
              p.page === page.page
                ? "bg-primary text-white"
                : p.disposition === "unreadable"
                  ? "bg-warn-soft text-warn-ink"
                  : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {p.page}
          </Link>
        ))}
      </nav>
    </section>
  );
}
