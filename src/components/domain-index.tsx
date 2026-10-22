import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import type { CardData } from "@/lib/views";
import { DomainJumpLink } from "./domain-jump-link";

/** One chip per domain, jumping to its card: the quickest way through sixteen cards. */
export function DomainIndex({ cards, prefix, compact = false }: { cards: CardData[]; prefix: string; compact?: boolean }) {
  return (
    <nav aria-label="Jump to a domain" className={compact ? "min-w-0 overflow-x-auto pb-2" : "claims-domain-nav"}>
      <ul className={compact ? "flex flex-wrap gap-1" : "flex gap-1 lg:flex-col"}>
        {cards.map((c) => {
          const out = c.result?.output as { not_found?: boolean; findings?: unknown[] } | null | undefined;
          return (
            <li key={c.domain.id}>
              <DomainJumpLink href={`#${prefix}-${c.domain.id}`}>
                <span className="flex-1">{c.domain.label}</span>
                {out && !out.not_found && <span className="text-muted tabular">{out.findings?.length ?? 0}</span>}
                {c.pending === "running" && <Loader2 className="size-3 animate-spin text-primary" aria-label="running" />}
                {c.pending === "queued" && <Clock className="size-3 text-muted" aria-label="queued" />}
                {c.error && !c.pending && <AlertTriangle className="size-3 text-bad" aria-label="failed" />}
                {out?.not_found && <span className="text-muted">· not found</span>}
              </DomainJumpLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
