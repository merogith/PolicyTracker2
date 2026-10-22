import { hue } from "@/lib/colors";

/** Plain-language labels and hues for document, job and result statuses. */
const STATUS: Record<string, { label: string; hue: number | null; live?: boolean }> = {
  uploaded: { label: "Waiting", hue: null },
  extracting: { label: "Reading pages", hue: 255, live: true },
  indexing: { label: "Indexing", hue: 255, live: true },
  analysing: { label: "Analysing", hue: 255, live: true },
  analysed: { label: "Analysed", hue: 150 },
  partial: { label: "Partially analysed", hue: 45 },
  failed: { label: "Failed", hue: 25 },
  deleting: { label: "Deleting", hue: null, live: true },
  queued: { label: "Queued", hue: null },
  running: { label: "Running", hue: 255, live: true },
  done: { label: "Done", hue: 150 },
  cancelled: { label: "Cancelled", hue: null },
  active: { label: "Active", hue: 150 },
};

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] ?? { label: status, hue: null };
  return (
    <span
      style={s.hue !== null ? hue(s.hue) : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        s.hue !== null ? "hue-soft" : "bg-surface-2 text-muted"
      }`}
    >
      <span className={`size-1.5 rounded-full ${s.hue !== null ? "hue-dot" : "bg-muted"} ${s.live ? "pulse" : ""}`} />
      {label ?? s.label}
    </span>
  );
}
