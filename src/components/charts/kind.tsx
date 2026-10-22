/** Fixed document categories; unknown kinds have a neutral mark and their own text label. */
export const KIND_COLOR: Record<string, string> = {
  NDC: "var(--kind-ndc)",
  NAP: "var(--kind-nap)",
  LTS: "var(--kind-lts)",
  DRR: "var(--kind-drr)",
  NC: "var(--kind-nc)",
  BTR: "var(--kind-btr)",
  POL: "var(--kind-pol)",
};

export function kindColor(kind: string) {
  return KIND_COLOR[kind] ?? "var(--kind-other)";
}

export function KindDot({ kind, size = 10 }: { kind: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: kindColor(kind) }} aria-hidden />;
}

/** Kind label with its colour mark; the text stays in text colour. */
export function KindChip({ kind }: { kind: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium">
      <KindDot kind={kind} />
      {kind}
    </span>
  );
}
