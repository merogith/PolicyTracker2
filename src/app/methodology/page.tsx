import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClaimScoreMethodology, TopicScoreMethodology, ComparisonMethodology } from "@/components/methodology-content";

export default function MethodologyPage() {
  return <div className="max-w-4xl">
    <PageHeader title="Methodology" crumbs={[{label:"Countries",href:"/countries"},{label:"Methodology"}]}/>
    <p className="mb-6 text-sm text-muted">How documents become claims, topic scores, and regional comparisons.</p>
    <nav aria-label="Methodology sections" className="mb-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-primary-ink">
      {[["claim-points","Claim points"],["topics","Topics"],["comparison","Comparisons"],["labels","Filters and labels"],["sources","Source evidence"]].map(([id,label])=><a key={id} href={`#${id}`} className="hover:underline">{label}</a>)}
    </nav>
    <div className="space-y-10 [&_section]:scroll-mt-20 [&_h2]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold">
      <section id="claim-points"><h2>Claim points</h2><ClaimScoreMethodology/><p className="mt-3 text-sm leading-relaxed text-muted">The Action claims measure counts each group once when it includes a selected progression level. The default is stages 1–4. Level 0 includes Concern, Context, Projection, Result reported, Proposal, and Other. Unclassified claims are excluded. Selecting no stages gives zero actions; stage selection does not change claim points.</p></section>
      <section id="topics"><h2>Average action stage</h2><TopicScoreMethodology/>
        <p className="mt-3 text-sm leading-relaxed text-muted">Coverage and scoring use home topics in enabled domains. Related topics are assessed in their own home domain. With no domain filter, Claims also includes statements outside the assessed topic inventory.</p>
      </section>
      <section id="comparison"><h2>Regional comparisons</h2><ComparisonMethodology/>
        <p className="mt-3 text-sm leading-relaxed text-muted">Only complete, non-demo assessments enter the average. Each country has equal weight. Differences compare countries at this point in time, not progress over time. Source collections and national priorities may differ. A source filter limits the table and average to matching document collections; standardized scores and their colors still use the full eligible region.</p>
      </section>
      <section id="labels"><h2>Filters and labels</h2><div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>Filters combine across categories. A claim can carry several labels from its supporting findings and appear in several groups. The result count and CSV export count each claim once.</p>
        <p>“Other” means no predefined statement type fits. “Not stated / not extracted” means the label is missing. Context, Projection, Result reported, and Proposal are distinct statement types.</p>
        <p>Claims with incomplete labels remain searchable, using their older statement type where available. Detailed filters apply to classified evidence. Targets includes only claims classified as targets; missing labels do not establish that targets are absent.</p>
        <p>Reported figures retain their stated value, unit, period, baseline, and conditions. Values are not converted or added together. Periods may describe a baseline, reporting period, or target year.</p>
      </div></section>
      <section id="sources"><h2>Source evidence and processing</h2><div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>Source links open the cited document page and highlight the quotation. “Text matched” confirms a quotation was found in extracted page text; it does not verify interpretation, implementation, or policy effectiveness. Unmatched quotations remain flagged.</p>
        <p>Each document is processed before the next starts for that country. With one document, the overview uses its analysis directly. With several, the combined overview is prepared after their analyses finish.</p>
        <p>Text pages are searchable. Scanned pages require OCR. Failed or unfinished analysis is shown as incomplete, not as evidence of no policy.</p>
      </div></section>
    </div>
    <Link href="/countries" className="mt-10 inline-block text-sm text-primary-ink hover:underline">Back to countries</Link>
  </div>;
}
