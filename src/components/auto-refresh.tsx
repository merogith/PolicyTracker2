"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { STATIC_DEMO } from "@/lib/static-demo";

/** Refresh server data every few seconds while something is running, and say so. */
export function AutoRefresh({ active: running, seconds = 3 }: { active: boolean; seconds?: number }) {
  const active = running && !STATIC_DEMO;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!active || pending) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [active, pending, seconds, router]);
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-ink" title={`This page updates every ${seconds} seconds while work is running`}>
      <span className="pulse size-1.5 rounded-full bg-primary" />
      Processing
    </span>
  );
}
