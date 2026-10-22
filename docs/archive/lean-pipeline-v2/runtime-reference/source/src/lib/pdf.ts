// Page-level text extraction with pdfjs-dist. Compared with pdf-parse 2.4 on two real multi-page
// PDFs: identical text per page after whitespace normalisation. pdfjs-dist is kept because it is the
// engine pdf-parse wraps (pdf-parse bundles an older pdfjs that clashes with a direct import in one
// process) and because it exposes PDF page labels.
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { UNREADABLE_MIN_CHARS } from "./domain";

export interface ExtractedPage {
  page: number;
  label: string | null;
  text: string;
  readable: boolean;
}

async function load(data: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    verbosity: 0,
  });
  return { task, doc: await task.promise };
}

export async function countPages(data: Buffer): Promise<number> {
  const { task, doc } = await load(data);
  const n = doc.numPages;
  await task.destroy();
  return n;
}

export async function extractPages(data: Buffer): Promise<ExtractedPage[]> {
  const { task, doc } = await load(data);
  try {
    const labels = (await doc.getPageLabels()) as string[] | null;
    const pages: ExtractedPage[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = joinItems(content.items.filter((it): it is TextItem => "str" in it));
      page.cleanup();
      pages.push({
        page: i,
        label: labels?.[i - 1] || null,
        text,
        readable: text.replace(/\s+/g, "").length >= UNREADABLE_MIN_CHARS,
      });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

/** Join text items, adding a space where two items on one line are visibly apart. */
function joinItems(items: TextItem[]): string {
  let out = "";
  let prevEnd: number | null = null;
  let prevY: number | null = null;
  for (const it of items) {
    const x = it.transform[4];
    const y = it.transform[5];
    const size = Math.abs(it.transform[0]) || it.height || 10;
    if (prevEnd !== null && prevY !== null && Math.abs(y - prevY) < size / 2 && x - prevEnd > size * 0.15) {
      if (!/\s$/.test(out) && !/^\s/.test(it.str)) out += " ";
    }
    out += it.str;
    if (it.hasEOL) {
      out += "\n";
      prevEnd = null;
    } else {
      prevEnd = x + it.width;
    }
    prevY = y;
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
