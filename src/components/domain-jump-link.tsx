"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const snapshot = () => window.location.hash;
const serverSnapshot = () => "";

export function DomainJumpLink({ href, children }: { href: string; children: React.ReactNode }) {
  const hash = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const active = hash === href;
  return <a href={href} aria-current={active ? "location" : undefined} className={`claims-domain-link flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-primary-soft font-medium text-primary-ink" : "text-muted hover:bg-surface hover:text-foreground"}`}>{children}</a>;
}
