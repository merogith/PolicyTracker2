/** Safe to pass to the browser: never include credential values. */
export function aiMode(env: Record<string, string | undefined> = process.env): "demo" | "missing_key" | "live" {
  if (env.OPENAI_FAKE === "1") return "demo";
  return env.OPENAI_API_KEY?.trim() ? "live" : "missing_key";
}

export function isDemoId(id: string | null | undefined) {
  return Boolean(id?.includes("_fake_"));
}

export function isDemoSource(sources: unknown) {
  if (!sources || typeof sources !== "object") return false;
  const source = sources as { mode?: unknown; responseId?: unknown; queries?: unknown };
  return source.mode === "demo"
    || (typeof source.responseId === "string" && isDemoId(source.responseId))
    || (Array.isArray(source.queries) && source.queries.some(q => typeof q === "string" && q.startsWith("(fake)")));
}
