import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { KindChip } from "@/components/charts/kind";
import { DomainIndex } from "@/components/domain-index";
import { Fact, PageHeader } from "@/components/page-header";
import { PageViewer } from "@/components/page-viewer";
import { ResultCard } from "@/components/result-card";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { loadTaxonomy } from "@/lib/taxonomy";
import { documentCards, verifiedRate } from "@/lib/views";
import { getCountry } from "@/lib/countries";
import { readReport, reportDocument } from "@/lib/report-reader";
import { ReportProvider } from "@/components/report-link";

const BUSY = ["uploaded", "extracting", "indexing", "analysing"];

export default async function DocumentPage({ params, searchParams }: PageProps<"/countries/[iso3]/documents/[id]">) {
  const { iso3, id } = await params;
  const sp = await searchParams;
  const country = await getCountry(iso3);
  if (!country) notFound();
  const report = typeof sp.report === "string" ? await readReport(country.id, sp.report).catch((error: unknown) => {
    if (error instanceof UserError && error.status === 404) notFound();
    throw error;
  }) : null;
  const saved = report ? reportDocument(report.data, id) : null;
  const doc = report ? saved ? { ...saved, country } : null : await db.document.findUnique({ where: { id }, include: { country: true, pages: { orderBy: { page: "asc" } } } });
  if (!doc || doc.country.iso3 !== iso3.toUpperCase() || doc.status === "deleting") notFound();

  const tax = report?.data.taxonomy ?? await loadTaxonomy();
  const cards = report?.data.documentCards[id] ?? await documentCards(doc.id, tax.domains, tax.version);
  const rate = verifiedRate(cards);
  const citeId = typeof sp.cite === "string" ? sp.cite : null;
  const cite = citeId ? report ? [...report.data.cards, ...Object.values(report.data.documentCards).flat()].flatMap(card => card.result?.citations ?? []).find(c => c.id === citeId && c.documentId === id) ?? null : await db.citation.findUnique({ where: { id: citeId } }) : null;
  const pageNumber = Number(sp.page) || cite?.page || 1;
  const unreadable = doc.pages.filter((p) => p.disposition === "unreadable").map((p) => p.page);
  const basePath = `/countries/${doc.country.iso3}/documents/${doc.id}`;
  const pdfUrl = `/api/documents/${doc.id}/pdf${report ? `?report=${report.id}` : ""}`;

  return (
    <ReportProvider iso3={country.iso3} id={report?.id}><div>
      <PageHeader
        crumbs={[
          { label: "Countries", href: "/countries" },
          { label: doc.country.name, href: `/countries/${doc.country.iso3}?tab=${doc.id}` },
          { label: doc.id },
        ]}
        title={doc.title}
        meta={
          <>
            <span className="font-mono text-xs">{doc.id}</span>
            <KindChip kind={doc.kind} />
            <Fact>edition {doc.editionDate}</Fact>
            <Fact>{doc.pageCount ?? "?"} pages</Fact>
            {unreadable.length > 0 && <Fact tone="warn">no text on p. {unreadable.join(", ")}</Fact>}
            <StatusBadge status={doc.status} />
            {rate.total > 0 && (
              <Fact tone={rate.verified / rate.total >= 0.9 ? "ok" : "warn"}>
                {rate.verified}/{rate.total} quotes matched
              </Fact>
            )}
            <AutoRefresh active={BUSY.includes(doc.status) || cards.some((c) => c.pending)} />
          </>
        }
        actions={
          <>
            <a href={`${pdfUrl}${report ? "&" : "?"}download`} className="btn">
              <Download className="size-3.5" aria-hidden /> Download PDF
            </a>
          </>
        }
      />
      {doc.error && <p className="mb-4 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad-ink">{doc.error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <details className="border-b border-border pb-3">
            <summary className="w-fit cursor-pointer py-2 text-sm text-muted">Browse findings by domain</summary>
            <DomainIndex cards={cards} prefix="domain" compact />
          </details>
          <div className="flex flex-col gap-5">
            {cards.map((card) => (
              <ResultCard key={card.domain.id} anchor={`domain-${card.domain.id}`} card={card} iso3={doc.country.iso3} rerun={{ documentId: doc.id }} showRaw />
            ))}
          </div>
          <details className="mt-4 text-sm">
            <summary className="w-fit cursor-pointer text-muted">Analysis options</summary>
            <div className="mt-3"><ActionButton url="/api/results/rerun" body={{ documentId: doc.id }} label="Re-run analysis" icon="rerun" confirm={`Ask every domain again of ${doc.id}?`} /></div>
          </details>
        </div>
        <div className="order-first xl:sticky xl:top-6 xl:order-none xl:self-start">
          <PageViewer
            pages={doc.pages}
            pageNumber={pageNumber}
            quote={cite && cite.documentId === doc.id ? cite.quote : null}
            basePath={basePath}
            pdfUrl={pdfUrl}
          />
        </div>
      </div>
    </div></ReportProvider>
  );
}
