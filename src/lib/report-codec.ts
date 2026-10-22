/** JSON graph encoding preserves shared claims, Maps and Dates. Functions are restored by the reader. */
type Atom = null | boolean | number | string | { ref: number };
type Node = { kind: "object"; entries: Array<[string, Atom]> }
  | { kind: "array"; values: Atom[] }
  | { kind: "map"; entries: Array<[Atom, Atom]> }
  | { kind: "date"; value: string };
export interface ReportGraph { root: Atom; nodes: Node[] }

export function encodeReport(value: unknown): ReportGraph {
  const nodes: Node[] = [];
  const seen = new Map<object, number>();
  function encode(v: unknown): Atom {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" || typeof v === "boolean" || typeof v === "number") return v;
    if (typeof v !== "object") throw new Error("Unsupported report value");
    const existing = seen.get(v);
    if (existing !== undefined) return { ref: existing };
    const ref = nodes.length;
    seen.set(v, ref);
    nodes.push({ kind: "object", entries: [] });
    nodes[ref] = v instanceof Date ? { kind: "date", value: v.toISOString() }
      : v instanceof Map ? { kind: "map", entries: [...v].map(([k, item]) => [encode(k), encode(item)]) }
      : Array.isArray(v) ? { kind: "array", values: v.map(encode) }
      : { kind: "object", entries: Object.entries(v).filter(([, item]) => typeof item !== "function" && item !== undefined).map(([k, item]) => [k, encode(item)]) };
    return { ref };
  }
  return { root: encode(value), nodes };
}

export function decodeReport<T>(graph: ReportGraph): T {
  const objects: unknown[] = graph.nodes.map(n => n.kind === "date" ? new Date(n.value) : n.kind === "map" ? new Map() : n.kind === "array" ? [] : {});
  const decode = (a: Atom): unknown => a !== null && typeof a === "object" ? objects[a.ref] : a;
  graph.nodes.forEach((n, i) => {
    if (n.kind === "object") for (const [k, v] of n.entries) Object.defineProperty(objects[i], k, { value: decode(v), enumerable: true, writable: true, configurable: true });
    if (n.kind === "array") (objects[i] as unknown[]).push(...n.values.map(decode));
    if (n.kind === "map") for (const [k, v] of n.entries) (objects[i] as Map<unknown, unknown>).set(decode(k), decode(v));
  });
  return decode(graph.root) as T;
}
