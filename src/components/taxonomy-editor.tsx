"use client";

import { homeTopics, relatedTopics } from "@/lib/topic-inventory";

import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, RotateCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { domainHue, hue } from "@/lib/colors";
import { plural } from "@/lib/plural";
import { STATIC_DEMO } from "@/lib/static-demo";

export interface EditorDomain {
  id: string;
  prefix: string;
  label: string;
  definition: string;
  groups: Array<{ id: string; label: string }>;
  searchHints: string[];
  maxResults: number;
  version: number;
  enabled: boolean;
  answers: number;
}

export interface EditorTopic {
  id: string;
  label: string;
  definition: string;
  placements: Array<{ domain: string; group: string }>;
  routing: Array<{ when: string; use: string }>;
  legacyIds: string[];
}

interface Plan {
  rerunDomains: string[];
  documentRuns: number;
  summaryRuns: number;
  retagAnswers: number;
  estimateUsd: number;
  overCap: string | null;
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

function describe(p: Plan) {
  const parts: string[] = [];
  if (p.documentRuns || p.summaryRuns)
    parts.push(
      `asks ${plural(p.rerunDomains.length, "domain question")} again (${plural(p.documentRuns, "document answer")}, ${plural(p.summaryRuns, "combined summary", "combined summaries")})`,
    );
  if (p.retagAnswers) parts.push(`re-tags ${plural(p.retagAnswers, "stored answer")} with the new taxonomy (cheaper model, pages not read again)`);
  if (!parts.length) return "Nothing needs to re-run.";
  return `Saving ${parts.join(", and ")}. Estimated $${p.estimateUsd.toFixed(2)}.`;
}

/** Shows what saving would do, refreshed as the form changes. */
function Impact({ preview, error }: { preview: Plan | null; error: string | null }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
      {error ? (
        <p className="text-bad-ink">{error}</p>
      ) : preview ? (
        <>
          <p>{describe(preview)}</p>
          {preview.overCap && <p className="mt-1 text-bad-ink">{preview.overCap}</p>}
        </>
      ) : (
        <p className="text-muted">Working out what saving would do…</p>
      )}
    </div>
  );
}

function usePreview(url: string, method: string, body: unknown, enabled = true) {
  const [preview, setPreview] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(body);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(async () => {
      try {
        setPreview((await call(url, method, { ...(JSON.parse(key) as object), preview: true })) as Plan);
        setError(null);
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [url, method, key, enabled]);
  return { preview, error };
}

function Dialog({ title, children, onClose, h }: { title: string; children: React.ReactNode; onClose: () => void; h?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-full max-w-2xl rounded-xl border border-border bg-surface p-0 text-foreground shadow-card backdrop:bg-black/40">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5" style={h !== undefined ? hue(h) : undefined}>
            {h !== undefined && <span className="hue-dot size-3 rounded-full" />}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()} aria-label="Close">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function Actions({ busy, disabled, label, onCancel }: { busy: boolean; disabled?: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn" onClick={onCancel}>
        Cancel
      </button>
      <button disabled={busy || disabled} className="btn btn-primary">
        {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {label}
      </button>
    </div>
  );
}

// ---------- domain dialog ----------

function DomainDialog({ domain, onDone }: { domain: EditorDomain | null; onDone: (msg: string | null) => void }) {
  const isNew = !domain;
  const [form, setForm] = useState({
    id: domain?.id ?? "",
    prefix: domain?.prefix ?? "",
    label: domain?.label ?? "",
    definition: domain?.definition ?? "",
    groups: domain?.groups.map((g) => g.label).join("\n") ?? "General",
    searchHints: domain?.searchHints.join(", ") ?? "",
    maxResults: domain?.maxResults ?? 20,
    enabled: domain?.enabled ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const groupsBody = form.groups
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label) => ({ id: domain?.groups.find((g) => g.label === label)?.id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label }));
  const body = {
    ...(isNew ? { id: form.id, prefix: form.prefix } : {}),
    label: form.label,
    definition: form.definition,
    groups: groupsBody,
    searchHints: form.searchHints.split(/[\n,;]/).map((h) => h.trim()).filter(Boolean),
    maxResults: Number(form.maxResults),
    enabled: form.enabled,
  };
  const url = isNew ? "/api/taxonomy/domains" : `/api/taxonomy/domains/${domain!.id}`;
  const method = isNew ? "POST" : "PATCH";
  const { preview, error } = usePreview(url, method, body);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    try {
      const plan = (await call(url, method, body)) as Plan;
      onDone(`Saved ${form.label}. ${describe(plan)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={isNew ? "Add a domain" : `Edit ${domain!.label}`} onClose={() => onDone(null)} h={domainHue(form.id || domain?.id || "new")}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem_2fr]">
          <label className="label">
            ID
            <input className="field" value={form.id} disabled={!isNew} required placeholder="cryosphere" onChange={(e) => set("id", e.target.value)} />
          </label>
          <label className="label">
            Prefix
            <input className="field uppercase" value={form.prefix} disabled={!isNew} required maxLength={4} placeholder="CRY" onChange={(e) => set("prefix", e.target.value.toUpperCase())} />
          </label>
          <label className="label">
            Label
            <input className="field" value={form.label} required onChange={(e) => set("label", e.target.value)} />
          </label>
        </div>
        <label className="label">
          Definition (part of the question asked of every document)
          <textarea className="field" rows={3} value={form.definition} required onChange={(e) => set("definition", e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            Groups for its topics (one per line)
            <textarea className="field" rows={3} value={form.groups} onChange={(e) => set("groups", e.target.value)} />
          </label>
          <div className="flex flex-col gap-3">
            <label className="label">
              Extra search phrases (comma separated)
              <input className="field" value={form.searchHints} onChange={(e) => set("searchHints", e.target.value)} />
            </label>
            <div className="flex items-end gap-3">
              <label className="label">
                Passages per search
                <input className="field w-24" type="number" min={1} max={50} value={form.maxResults} onChange={(e) => set("maxResults", Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" className="accent-[var(--primary)]" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Asked of documents
              </label>
            </div>
            <p className="text-xs text-muted">Passages returned by each search.</p>
          </div>
        </div>
        <p className="text-xs text-muted">Changing the label or definition changes this domain&apos;s question, so its answers are asked again; groups, search phrases and passages per search apply to the next run.</p>
        <Impact preview={preview} error={error} />
        {saveError && <p role="alert" className="rounded-md bg-bad-soft px-2.5 py-1.5 text-sm text-bad-ink">{saveError}</p>}
        <Actions busy={busy} disabled={!!error || !!preview?.overCap} label={isNew ? "Add domain" : "Save"} onCancel={() => onDone(null)} />
      </form>
    </Dialog>
  );
}

// ---------- topic dialog ----------

function TopicDialog({ topic, domains, homeDomain, onDone }: { topic: EditorTopic | null; domains: EditorDomain[]; homeDomain?: string; onDone: (msg: string | null) => void }) {
  const isNew = !topic;
  const first = topic?.placements[0] ?? { domain: homeDomain ?? domains[0]?.id ?? "", group: domains.find((d) => d.id === (homeDomain ?? domains[0]?.id))?.groups[0]?.id ?? "" };
  const [label, setLabel] = useState(topic?.label ?? "");
  const [definition, setDefinition] = useState(topic?.definition ?? "");
  const [placements, setPlacements] = useState(topic?.placements ?? [first]);
  const [routing, setRouting] = useState(topic?.routing ?? []);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const body = { label, definition, placements, routing: routing.filter((r) => r.when.trim() && r.use.trim()) };
  const url = isNew ? "/api/taxonomy/topics" : `/api/taxonomy/topics/${topic!.id}`;
  const method = isNew ? "POST" : "PATCH";
  const { preview, error } = usePreview(url, method, body, label.trim().length > 0 && definition.trim().length >= 10);
  const homeMoved = !isNew && placements[0]?.domain !== topic!.placements[0].domain;

  const setPlacement = (i: number, p: Partial<{ domain: string; group: string }>) =>
    setPlacements((ps) =>
      ps.map((x, j) => {
        if (j !== i) return x;
        const next = { ...x, ...p };
        if (p.domain) next.group = domains.find((d) => d.id === p.domain)?.groups[0]?.id ?? "";
        return next;
      }),
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    try {
      const out = (await call(url, method, body)) as Plan & { id: string; movedFrom?: string };
      onDone(`Saved ${out.id}${out.movedFrom ? ` (moved from ${out.movedFrom}, kept as its legacy ID)` : ""}. ${describe(out)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={isNew ? "Add a topic" : `Edit ${topic!.id}`} onClose={() => onDone(null)} h={domainHue(placements[0]?.domain ?? "x")}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <label className="label">
          Label
          <input className="field" value={label} required onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="label">
          Definition (what belongs here; the model tags findings by it)
          <textarea className="field" rows={3} value={definition} required onChange={(e) => setDefinition(e.target.value)} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">Placements: the first is the home domain and sets the ID prefix</legend>
          {placements.map((p, i) => {
            const d = domains.find((x) => x.id === p.domain);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-12 text-xs text-muted">{i === 0 ? "Home" : "Also in"}</span>
                <select className="field" value={p.domain} onChange={(e) => setPlacement(i, { domain: e.target.value })}>
                  {domains.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.prefix} {x.label}
                    </option>
                  ))}
                </select>
                <select className="field" value={p.group} onChange={(e) => setPlacement(i, { group: e.target.value })}>
                  {(d?.groups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                {i > 0 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlacements((ps) => ps.filter((_, j) => j !== i))} aria-label="Remove placement">
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-sm w-fit"
            onClick={() => setPlacements((ps) => [...ps, { domain: domains[0].id, group: domains[0].groups[0]?.id ?? "" }])}
          >
            <Plus className="size-3.5" aria-hidden /> Also place in a domain
          </button>
          {homeMoved && <p className="text-xs text-warn-ink">A new home domain gives the topic a new ID; the old ID is retired and kept as its legacy ID.</p>}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">Routing hints: when a finding is about…, use another topic</legend>
          {routing.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input className="field flex-1" placeholder="flood warning systems" value={r.when} onChange={(e) => setRouting((rs) => rs.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)))} />
              <span className="text-xs text-muted">use</span>
              <input className="field w-36" placeholder="DRM-03" value={r.use} onChange={(e) => setRouting((rs) => rs.map((x, j) => (j === i ? { ...x, use: e.target.value } : x)))} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRouting((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove hint">
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm w-fit" onClick={() => setRouting((rs) => [...rs, { when: "", use: "" }])}>
            <Plus className="size-3.5" aria-hidden /> Add a routing hint
          </button>
        </fieldset>
        <p className="text-xs text-muted">A definition or routing change only re-tags stored answers. A label or placement change also changes the question of the domains it sits in, so those are asked again.</p>
        <Impact preview={preview} error={error} />
        {saveError && <p role="alert" className="rounded-md bg-bad-soft px-2.5 py-1.5 text-sm text-bad-ink">{saveError}</p>}
        <Actions busy={busy} disabled={!!error || !!preview?.overCap} label={isNew ? "Add topic" : "Save"} onCancel={() => onDone(null)} />
      </form>
    </Dialog>
  );
}

// ---------- retire dialogs ----------

function RetireTopicDialog({ topic, topics, onDone }: { topic: EditorTopic; topics: EditorTopic[]; onDone: (msg: string | null) => void }) {
  const [replacedBy, setReplacedBy] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const url = `/api/taxonomy/topics/${topic.id}`;
  const { preview, error } = usePreview(url, "DELETE", { replacedBy });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = (await call(url, "DELETE", { replacedBy })) as Plan;
      onDone(`Retired ${topic.id}. ${describe(p)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={`Retire ${topic.id} ${topic.label}`} onClose={() => onDone(null)}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <p className="text-sm text-muted">The ID is never reused. Findings tagged with it are re-tagged; if another topic now covers it, name it so the old ID is listed as its legacy ID.</p>
        <label className="label">
          Replaced by (optional)
          <select
            multiple
            className="field h-32"
            value={replacedBy}
            onChange={(e) => setReplacedBy([...e.target.selectedOptions].map((o) => o.value))}
          >
            {topics
              .filter((t) => t.id !== topic.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} {t.label}
                </option>
              ))}
          </select>
        </label>
        <Impact preview={preview} error={error} />
        {saveError && <p role="alert" className="rounded-md bg-bad-soft px-2.5 py-1.5 text-sm text-bad-ink">{saveError}</p>}
        <Actions busy={busy} disabled={!!error || !!preview?.overCap} label="Retire topic" onCancel={() => onDone(null)} />
      </form>
    </Dialog>
  );
}

// ---------- page ----------

export function TaxonomyEditor({ domains, topics }: { domains: EditorDomain[]; topics: EditorTopic[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    | { kind: "domain"; domain: EditorDomain | null }
    | { kind: "topic"; topic: EditorTopic | null; home?: string }
    | { kind: "retireTopic"; topic: EditorTopic }
    | null
  >(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const done = (msg: string | null) => {
    setDialog(null);
    if (msg) {
      setMessage({ tone: "ok", text: msg });
      router.refresh();
    }
  };

  async function act(fn: () => Promise<unknown>, ok: (r: unknown) => string) {
    try {
      const r = await fn();
      setMessage({ tone: "ok", text: ok(r) });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "bad", text: err instanceof Error ? err.message : String(err) });
    }
  }

  function move(i: number, delta: number) {
    const ids = domains.map((d) => d.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act(() => call("/api/taxonomy/domains/reorder", "POST", { ids }), () => "Order saved.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted">
          {STATIC_DEMO ? "The domains and topics used for this analysis." : "Manage domains and topics. Review the effect of each edit before saving."}
        </p>
        <div className="flex gap-2">
          <a href="/api/taxonomy" className="btn">
            Download JSON
          </a>
          {!STATIC_DEMO && <button className="btn btn-primary" onClick={() => setDialog({ kind: "domain", domain: null })}>
            <Plus className="size-3.5" aria-hidden /> Add domain
          </button>}
        </div>
      </div>
      {message && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${message.tone === "ok" ? "bg-ok-soft text-ok-ink" : "bg-bad-soft text-bad-ink"}`}>
          {message.text}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {domains.map((d, i) => {
          const home = homeTopics(topics, d.id);
          const related = relatedTopics(topics, d.id);
          const isOpen = open[d.id] ?? false;
          return (
            <li key={d.id} className={`panel overflow-hidden ${d.enabled ? "" : "opacity-60"}`} style={hue(domainHue(d.id))}>
              <div className="flex flex-wrap items-start gap-3 border-b border-border bg-surface px-4 py-3">
                {!STATIC_DEMO && <div className="flex flex-col">
                  <button aria-label={`Move ${d.label} up`} onClick={() => move(i, -1)} disabled={i === 0} className="btn btn-ghost btn-sm px-1 disabled:opacity-30">
                    <ChevronUp className="size-4" aria-hidden />
                  </button>
                  <button aria-label={`Move ${d.label} down`} onClick={() => move(i, 1)} disabled={i === domains.length - 1} className="btn btn-ghost btn-sm px-1 disabled:opacity-30">
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </div>}
                <div className="flex min-w-60 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hue-dot size-2.5 rounded-full" />
                    <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold">{d.prefix}</span>
                    <span className="font-semibold">{d.label}</span>
                    {!d.enabled && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">not asked</span>}
                  </div>
                  <p className="max-w-3xl text-sm">{d.definition}</p>
                  <p className="text-xs text-muted">
                    {plural(home.length, "home topic")}{related.length > 0 && ` · ${related.length} related`} · {plural(d.answers, "result")}
                  </p>
                </div>
                {!STATIC_DEMO && <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-sm" onClick={() => setDialog({ kind: "domain", domain: d })}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={!d.enabled}
                    onClick={() =>
                      window.confirm(`Ask "${d.label}" again of every document?`) &&
                      act(
                        () => call(`/api/taxonomy/domains/${d.id}/rerun`, "POST"),
                        (r) => `Queued: ${describe(r as Plan)}`,
                      )
                    }
                  >
                    <RotateCw className="size-3.5" aria-hidden /> Re-run
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      window.confirm(`Retire the domain "${d.label}"? Its ID and prefix are never reused.`) &&
                      act(
                        () => call(`/api/taxonomy/domains/${d.id}`, "DELETE", {}),
                        (r) => `Retired ${d.label}. ${describe(r as Plan)}`,
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Retire
                  </button>
                </div>}
              </div>
              <div className="px-4 py-2">
                <button className="flex w-full items-center justify-between py-1.5 text-sm font-medium" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [d.id]: !isOpen }))}>
                  <span>{isOpen ? "Hide topics" : `Show ${plural(home.length, "home topic")}${related.length ? ` + ${related.length} related` : ""}`}</span>
                  {isOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-3 pb-3">
                    <p className="text-xs text-muted">Version {d.version} · {plural(d.maxResults,"passage")} per search{d.searchHints.length>0&&` · Search phrases: ${d.searchHints.join(", ")}`}</p>
                    {[{ label: "Home topics", topics: home }, { label: "Related topics", topics: related }].filter(scope => scope.topics.length > 0).map(scope => (
                      <section key={scope.label} className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">{scope.label} · {scope.topics.length}</h3>
                    {d.groups.map((g) => {
                      const inGroup = scope.topics.filter((t) => t.placements.find((p) => p.domain === d.id)?.group === g.id);
                      if (inGroup.length === 0) return null;
                      return (
                        <div key={g.id}>
                          <h4 className="mb-1 text-xs font-semibold text-muted">{g.label}</h4>
                          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                            {inGroup.map((t) => {
                              const home = t.placements[0].domain === d.id;
                              return (
                                <li key={t.id} className="flex flex-wrap items-start gap-3 px-3 py-2">
                                  <div className="min-w-60 flex-1">
                                    <p className="text-sm">
                                      <span className="font-mono text-xs font-semibold">{t.id}</span> {t.label}
                                      {!home && <span className="ml-2 text-[11px] text-muted">home: {domains.find((x) => x.id === t.placements[0].domain)?.label}</span>}
                                    </p>
                                    <p className="line-clamp-2 text-xs text-muted" title={t.definition}>
                                      {t.definition}
                                    </p>
                                    {(t.routing.length > 0 || t.legacyIds.filter((l) => l !== t.id).length > 0) && (
                                      <p className="mt-0.5 text-[11px] text-muted">
                                        {t.routing.length > 0 && plural(t.routing.length, "routing hint")}
                                        {t.legacyIds.filter((l) => l !== t.id).length > 0 && ` · formerly ${t.legacyIds.filter((l) => l !== t.id).join(", ")}`}
                                      </p>
                                    )}
                                  </div>
                                  {home && !STATIC_DEMO && (
                                    <div className="flex gap-1.5">
                                      <button className="btn btn-sm" onClick={() => setDialog({ kind: "topic", topic: t })}>
                                        <Pencil className="size-3.5" aria-hidden /> Edit
                                      </button>
                                      <button className="btn btn-danger btn-sm" onClick={() => setDialog({ kind: "retireTopic", topic: t })}>
                                        <Trash2 className="size-3.5" aria-hidden /> Retire
                                      </button>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                      </section>
                    ))}
                    {!STATIC_DEMO && <button className="btn btn-sm w-fit" onClick={() => setDialog({ kind: "topic", topic: null, home: d.id })}>
                      <Plus className="size-3.5" aria-hidden /> Add a topic to {d.label}
                    </button>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {dialog?.kind === "domain" && <DomainDialog domain={dialog.domain} onDone={done} />}
      {dialog?.kind === "topic" && <TopicDialog topic={dialog.topic} domains={domains} homeDomain={dialog.home} onDone={done} />}
      {dialog?.kind === "retireTopic" && <RetireTopicDialog topic={dialog.topic} topics={topics} onDone={done} />}
    </div>
  );
}
