import { AlertTriangle, CheckCircle2 } from "lucide-react";

/** Share of quotes found on the cited page. Unverified quotes stay visible, flagged, on the cards. */
export function VerifiedMeter({ verified, total }: { verified: number; total: number }) {
  if (total === 0) return <p className="text-sm text-muted">No quotes yet.</p>;
  const pct = (100 * verified) / total;
  const unverified = total - verified;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-semibold tracking-tight">{pct.toFixed(0)}%</span>
        <span className="text-sm text-muted">of quotes found on the cited page</span>
      </div>
      <div
        className="flex h-2.5 gap-[2px] overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={verified}
        aria-label={`${verified} of ${total} quotes matched`}
      >
        <span className="h-full rounded-l-full" style={{ width: `${pct}%`, background: "var(--status-good)" }} />
        {unverified > 0 && <span className="h-full flex-1 rounded-r-full" style={{ background: "var(--status-critical)" }} />}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1 text-ok-ink">
          <CheckCircle2 className="size-3.5" aria-hidden /> {verified} matched
        </span>
        <span className={`flex items-center gap-1 ${unverified ? "text-bad-ink" : "text-muted"}`}>
          <AlertTriangle className="size-3.5" aria-hidden /> {unverified} not found on the page
        </span>
      </div>
    </div>
  );
}
