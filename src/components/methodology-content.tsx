import { ACTION_STAGE_SCALE } from "@/lib/documentation-stage";
import { formatMetric } from "@/lib/dashboard-metrics";

export function ClaimScoreMethodology() {
  return <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
    <p><strong className="text-foreground">Claim points add the reported progression of distinct claims.</strong> Concern, Context, Projection, Result reported, Proposal and Other = 0; Commitment = 1; Planned action = 2; Underway = 3; Delivered = 4.</p>
    <p>A topic sums the claims tagged to it. A domain counts each claim once across its home topics; the country counts each claim once overall. Exact restatements with the same figures and statement type are grouped across documents; different wording or progression states stay separate. Multiple tags do not add points. Topic and domain rows can overlap, so their totals must not be added together. Example: two different plans and one delivered claim give 2 + 2 + 4 = 8 points.</p>
    <p>Detailed source classifications take precedence over older broad stages. Conflicting progression levels and missing classifications remain unresolved and are excluded from the observed sum. Partial sums are marked provisional and excluded from regional comparisons. Points use the saved claim type; quotation matching is tracked separately, with unmatched evidence flagged for inspection.</p>
    <p>These totals measure documented action volume and reported progression. They do not measure policy effectiveness or whether national priorities are appropriate. Countries may have different domain priorities and source collections. Average action stage summarizes the mix of action claims within each topic.</p>
  </div>;
}

export function TopicScoreMethodology() {
  return <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
    <p><strong className="text-foreground">Average action stage summarizes all scored action claims in a topic.</strong> Each distinct claim uses the same stage as the claim-points KPI, scaled to 100:</p>
    <ol className="grid gap-2 sm:grid-cols-4">{ACTION_STAGE_SCALE.map((stage,i)=><li key={stage.label} className="rounded-lg border border-border p-3"><strong className="mb-1 block w-fit rounded px-2 py-1 text-lg tabular" style={{background:`var(--ladder-${i+1})`,color:`var(--ladder-ink-${i+1})`}}>{formatMetric(stage.value,"/100")}/100</strong>{stage.label}</li>)}</ol>
    <p><strong className="text-foreground">Topic score = action-claim points ÷ action claims × 25.</strong> Ten commitments and one delivered claim display as 32/100; one commitment and ten delivered claims display as 93/100. Scores are rounded for display. Each distinct claim counts once, using only evidence tagged to that topic.</p>
    <p>Context claims are excluded. A completed topic with no action claims shows “No action documented.” Domain and country scores average the scored home topics with equal topic weights; topics without an action-stage score stay outside that average. Coverage remains a separate measure.</p>
    <p>Only source-matched claims with a resolved stage enter the average. Incomplete assessments are provisional and excluded from regional benchmarks. Their averages can rise or fall as evidence is added. This summarizes reported stages, not independently verified delivery.</p>
  </div>;
}
export function ComparisonMethodology() {
  return <p className="text-xs leading-relaxed text-muted"><strong className="font-medium text-foreground">Standardized regional score = 100 × Φ(z), where z = (raw total − regional average) ÷ population standard deviation (SD).</strong> Φ converts z through the standard normal curve. The regional average maps to 50; −1/+1 SD to 15.9/84.1; −2/+2 SD to 2.3/97.7. Equal totals all receive 50 by convention, even if all raw totals are zero. This is a standardized comparison, not an observed percentile or percentage implementation. Extreme totals affect the average and SD; differences near the ends of the scale are compressed. Each domain or topic is compared with the same domain or topic across at least two complete, non-demo countries. Small groups make the comparison sensitive to individual countries. Colors use the same raw SD bands. Partial results have no standardized score; the reference uses the whole eligible region regardless of display filters.</p>;
}

