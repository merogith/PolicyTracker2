"use client";

import { FileUp, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DOCUMENT_KINDS } from "@/lib/domain";

type UploadItem = {
  key: string;
  file: File;
  title: string;
  kind: string;
  editionDate: string;
  language: string;
  status: "waiting" | "uploading" | "uploaded" | "failed";
  detail?: string;
};

export function UploadForm({ iso3 }: { iso3: string }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const pending = items.filter((item) => item.status !== "uploaded");

  function updateItem(key: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || pending.length === 0) return;
    submitting.current = true;
    setBusy(true);
    setMessage(null);
    let uploaded = 0;
    let failed = 0;
    let estimateUsd = 0;
    try {
      for (const [index, item] of pending.entries()) {
        setProgress(`Uploading ${index + 1} of ${pending.length}…`);
        updateItem(item.key, { status: "uploading", detail: undefined });
        try {
          const form = new FormData();
          form.set("file", item.file);
          form.set("title", item.title);
          form.set("kind", item.kind);
          form.set("editionDate", item.editionDate);
          form.set("language", item.language);
          const res = await fetch(`/api/countries/${iso3}/documents`, { method: "POST", body: form });
          const json = (await res.json()) as { id?: string; error?: string; estimateUsd?: number; pageCount?: number };
          if (!res.ok) throw new Error(json.error ?? `Upload failed (HTTP ${res.status})`);
          uploaded++;
          estimateUsd += json.estimateUsd ?? 0;
          updateItem(item.key, { status: "uploaded", detail: `${json.id} · ${json.pageCount} pages · queued for analysis` });
        } catch (error) {
          failed++;
          updateItem(item.key, { status: "failed", detail: error instanceof Error ? error.message : "Upload failed. Please try again." });
        }
      }
      setMessage({
        tone: failed ? "bad" : "ok",
        text: `${uploaded} document${uploaded === 1 ? "" : "s"} uploaded.${failed ? ` ${failed} failed; review the errors and retry.` : ""}${uploaded ? ` Documents are analysed one at a time. Estimated cost about $${estimateUsd.toFixed(2)}. Follow progress in the document list.` : ""}`,
      });
      if (uploaded) router.refresh();
    } finally {
      submitting.current = false;
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-strong bg-surface-2 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary-soft focus-within:border-primary">
        <FileUp className="size-6 text-primary" aria-hidden />
        <span className="text-sm font-medium">{pending.length ? `${pending.length} PDF${pending.length === 1 ? "" : "s"} selected · Add more` : "Choose PDFs"}</span>
        <span className="text-xs text-muted">Select one or more PDFs with selectable text.</span>
        <input name="files" type="file" accept="application/pdf,.pdf" multiple disabled={busy} className="sr-only" onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setItems((current) => {
            const next = [...current];
            for (const file of files) {
              if (next.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue;
              next.push({ key: crypto.randomUUID(), file, title: file.name.replace(/\.pdf$/i, ""), kind: "NDC", editionDate: "", language: "", status: "waiting" });
            }
            return next;
          });
          e.target.value = "";
          setMessage(null);
        }} />
      </label>
      {items.length > 0 && <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.key} className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium">{index + 1}. {item.file.name}</p>
              <button type="button" disabled={busy} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))} className="shrink-0 rounded p-1 text-muted hover:bg-surface-2" aria-label={`Remove ${item.file.name} from selection`}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <fieldset disabled={busy || item.status === "uploaded"} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_0.6fr]">
              <legend className="sr-only">Details for {item.file.name}</legend>
              <label className="label">
                Title
                <input name={`title-${item.key}`} required value={item.title} onChange={(e) => updateItem(item.key, { title: e.target.value })} placeholder="e.g. NDC 3.0" className="field" />
              </label>
              <label className="label">
                Kind
                <select name={`kind-${item.key}`} required className="field" value={item.kind} onChange={(e) => updateItem(item.key, { kind: e.target.value })}>
                  {DOCUMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.id}: {k.label}</option>)}
                </select>
              </label>
              <label className="label">
                Edition date
                <input name={`date-${item.key}`} type="date" required value={item.editionDate} onChange={(e) => updateItem(item.key, { editionDate: e.target.value })} className="field" />
              </label>
              <label className="label">
                Language
                <input name={`language-${item.key}`} value={item.language} onChange={(e) => updateItem(item.key, { language: e.target.value })} placeholder="en" className="field" />
              </label>
            </fieldset>
            <p role="status" className={`mt-2 text-xs ${item.status === "failed" ? "text-bad-ink" : item.status === "uploaded" ? "text-ok-ink" : "text-muted"}`}>
              {item.status === "uploading" ? "Uploading…" : item.detail ?? "Ready to upload"}
            </p>
          </li>
        ))}
      </ol>}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy || pending.length === 0} className="btn btn-primary">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <FileUp className="size-3.5" aria-hidden />}
          {busy ? progress : pending.length > 1 ? `Upload and analyse ${pending.length} documents` : "Upload and analyse"}
        </button>
        {message && (
          <p role="status" className={`rounded-md px-2.5 py-1.5 text-sm ${message.tone === "ok" ? "bg-ok-soft text-ok-ink" : "bg-bad-soft text-bad-ink"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
