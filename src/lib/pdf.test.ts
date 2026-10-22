import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { countPages, extractPages } from "./pdf";

test("extracts every page beyond retrieval limits, including the last annex", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= 93; n++) {
    const page = pdf.addPage();
    if (n !== 47) page.drawText(n === 93 ? "Annex: fund water conservation programmes by 2030." : `This is the policy document text on page ${n}.`, { x: 30, y: 700, size: 12, font });
  }
  const data = Buffer.from(await pdf.save());
  assert.equal(await countPages(data), 93);
  const pages = await extractPages(data);
  assert.equal(pages.length, 93);
  assert.deepEqual(pages.map((p) => p.page), Array.from({ length: 93 }, (_, i) => i + 1));
  assert.equal(pages[46].readable, false);
  assert.equal(pages.filter((p) => p.readable).length, 92);
  assert.match(pages[92].text, /fund water conservation/);
  assert.equal(pages[92].readable, true);
});

test("short policy notes remain searchable while empty pages are marked unreadable", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("Ban coal by 2030.", { x: 30, y: 700, size: 12, font });
  pdf.addPage();
  const pages = await extractPages(Buffer.from(await pdf.save()));
  assert.equal(pages[0].text, "Ban coal by 2030.");
  assert.equal(pages[0].readable, true);
  assert.equal(pages[1].readable, false);
});
