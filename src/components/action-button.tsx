"use client";

import { Loader2, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATIC_DEMO } from "@/lib/static-demo";

const ICONS = { rerun: RotateCw, retry: RotateCcw, delete: Trash2, cancel: X } as const;

/** A button that calls an API route, then refreshes the page (or goes to `redirectTo`). */
export function ActionButton(props: {
  url: string;
  method?: "POST" | "DELETE" | "PATCH";
  body?: unknown;
  label: string;
  confirm?: string;
  redirectTo?: string;
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md";
  icon?: keyof typeof ICONS;
  title?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (STATIC_DEMO) return null;

  async function run() {
    if (props.confirm && !window.confirm(props.confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(props.url, {
        method: props.method ?? "POST",
        headers: props.body === undefined ? undefined : { "content-type": "application/json" },
        body: props.body === undefined ? undefined : JSON.stringify(props.body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (props.redirectTo) router.push(props.redirectTo);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const variant = props.variant === "primary" ? "btn-primary" : props.variant === "danger" ? "btn-danger" : props.variant === "ghost" ? "btn-ghost" : "";
  const Icon = props.icon ? ICONS[props.icon] : null;
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} title={props.title} className={`btn ${variant} ${props.size === "sm" ? "btn-sm" : ""}`}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {props.label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs text-bad-ink">
          {error}
        </span>
      )}
    </span>
  );
}
