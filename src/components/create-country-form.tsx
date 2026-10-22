"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateCountryForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/countries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iso3: form.get("iso3"), name: form.get("name") }),
      });
      const json = (await res.json()) as { iso3?: string; error?: string };
      if (!res.ok) return setError(json.error ?? `HTTP ${res.status}`);
      router.push(`/countries/${json.iso3}?tab=documents#upload`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="label">
        ISO3 code
        <input name="iso3" required maxLength={3} minLength={3} placeholder="KAZ" className="field w-24 uppercase" />
      </label>
      <label className="label min-w-48 flex-1">
        Country name
        <input name="name" required placeholder="Kazakhstan" className="field" />
      </label>
      <button disabled={busy} className="btn btn-primary">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
        {busy ? "Adding…" : "Add country"}
      </button>
      {error && (
        <p role="alert" className="w-full rounded-md bg-bad-soft px-2.5 py-1.5 text-sm text-bad-ink">
          {error}
        </p>
      )}
    </form>
  );
}
