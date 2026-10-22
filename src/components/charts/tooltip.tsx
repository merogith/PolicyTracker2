"use client";

import { useRef } from "react";

/**
 * One tooltip for every mark inside: marks carry data-tip-value and data-tip-label and are
 * focusable, so the same readout appears on hover and on keyboard focus.
 */
export function ChartTooltips({ children, className }: { children: React.ReactNode; className?: string }) {
  const tip = useRef<HTMLDivElement>(null);
  const valueEl = useRef<HTMLSpanElement>(null);
  const labelEl = useRef<HTMLSpanElement>(null);

  function show(target: EventTarget | null, x?: number, y?: number) {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-tip-value]");
    const t = tip.current;
    if (!t || !valueEl.current || !labelEl.current) return;
    if (!el) {
      t.hidden = true;
      return;
    }
    valueEl.current.textContent = el.dataset.tipValue ?? "";
    labelEl.current.textContent = el.dataset.tipLabel ?? "";
    t.hidden = false;
    const r = el.getBoundingClientRect();
    const left = x ?? r.left + r.width / 2;
    const top = y ?? r.top;
    const w = t.offsetWidth;
    t.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, left - w / 2))}px`;
    t.style.top = `${Math.max(8, top - t.offsetHeight - 10)}px`;
  }

  return (
    <div
      className={className}
      onPointerMove={(e) => show(e.target, e.clientX, e.clientY)}
      onPointerLeave={() => tip.current && (tip.current.hidden = true)}
      onFocus={(e) => show(e.target)}
      onBlur={() => tip.current && (tip.current.hidden = true)}
    >
      {children}
      <div
        ref={tip}
        hidden
        role="status"
        className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-card"
      >
        <span ref={valueEl} className="block text-sm font-semibold text-foreground" />
        <span ref={labelEl} className="block text-muted" />
      </div>
    </div>
  );
}
