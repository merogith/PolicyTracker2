// Citation check: does the quote occur on the cited page? This replaces human review (PLAN.md Part 7.3),
// on the model of fresh-start/scripts/check.py.

export interface PageText {
  page: number;
  label: string | null;
  text: string;
}

export interface Verdict {
  verified: boolean;
  /** Page where the quote was found; the cited page when it was not found. */
  page: number;
}

/** Lowercase, unify Unicode forms, drop quote marks and dashes (with the spaces around them), collapse whitespace. */
export function normalise(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/­/g, "")
    .replace(/["'`´‘’‚‛“”„‟«»‹›]/g, "")
    .replace(/\s*[-‐‑‒–—―−]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function squash(s: string) {
  return s.replace(/\s+/g, "");
}

/** Quote fragments around elisions ("…" or "..."); all must occur, in order. */
function fragments(quote: string) {
  return quote
    .split(/\s*(?:\.{3,}|…|\[\.\.\.\]|\[…\])\s*/)
    .map(normalise)
    .filter((f) => f.length >= 3);
}

function occursIn(pageText: string, frags: string[]) {
  const variants: Array<[string, (s: string) => string]> = [
    [normalise(pageText), (s) => s],
    [squash(normalise(pageText)), squash], // words split or joined by text extraction
  ];
  return variants.some(([hay, f]) => {
    let from = 0;
    for (const frag of frags) {
      const at = hay.indexOf(f(frag), from);
      if (at < 0) return false;
      from = at + f(frag).length;
    }
    return true;
  });
}

/**
 * Check one quote. Looks on the cited page, then the pages before and after it (page labels and
 * physical pages often differ by one), then pages whose printed label is the cited number.
 */
export function verifyQuote(quote: string, citedPage: number, pages: Map<number, PageText>): Verdict {
  const frags = fragments(quote);
  if (frags.length === 0 || frags.join("").length < 8) return { verified: false, page: citedPage };
  const candidates = [citedPage, citedPage - 1, citedPage + 1];
  for (const p of pages.values()) if (p.label === String(citedPage) && !candidates.includes(p.page)) candidates.push(p.page);
  for (const page of candidates) {
    const p = pages.get(page);
    if (p && occursIn(p.text, frags)) return { verified: true, page };
  }
  return { verified: false, page: citedPage };
}

const QUOTE_CHARS = /["'`´‘’‚‛“”„‟«»‹›­]/;
const DASH_CHARS = /[-‐‑‒–—―−]/;

/** normalise(), one character at a time, keeping for each output character its index in the input. */
function normaliseWithMap(s: string) {
  let out = "";
  const map: number[] = [];
  let skipSpace = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (QUOTE_CHARS.test(ch)) continue;
    if (DASH_CHARS.test(ch)) {
      while (out.endsWith(" ")) {
        out = out.slice(0, -1);
        map.pop();
      }
      skipSpace = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (skipSpace || out.length === 0 || out.endsWith(" ")) continue;
      out += " ";
      map.push(i);
      continue;
    }
    skipSpace = false;
    for (const c of ch.normalize("NFKC").toLowerCase()) {
      out += c;
      map.push(i);
    }
  }
  return { out, map };
}

/** Where the quote occurs in the page text, as [start, end) ranges of the original text, for highlighting. */
export function locateQuote(pageText: string, quote: string): Array<[number, number]> {
  const { out, map } = normaliseWithMap(pageText);
  const ranges: Array<[number, number]> = [];
  let from = 0;
  for (const frag of fragments(quote)) {
    const at = out.indexOf(frag, from);
    if (at < 0) return [];
    ranges.push([map[at], map[at + frag.length - 1] + 1]);
    from = at + frag.length;
  }
  return ranges;
}
