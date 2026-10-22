import assert from "node:assert/strict";
import { test } from "node:test";
import { locateQuote, normalise, verifyQuote, type PageText } from "./verify";

const pages = new Map<number, PageText>(
  [
    { page: 1, label: "i", text: "Foreword\nThe Government of Exampleland adopted this plan." },
    {
      page: 2,
      label: "1",
      text: "Exampleland commits to an unconditional target to reduce greenhouse gas\nemissions by 15 percent below 1990 levels by 2030.",
    },
    { page: 3, label: "2", text: "Drought-\nresistant wheat varieties will be distributed to 5,000 farms by 2027." },
    { page: 4, label: "3", text: "The “Green Economy” concept — adopted in 2013 — sets the long-term path." },
  ].map((p) => [p.page, p]),
);

test("exact quote on the cited page", () => {
  assert.deepEqual(verifyQuote("reduce greenhouse gas emissions by 15 percent below 1990 levels", 2, pages), { verified: true, page: 2 });
});

test("case, line breaks and spacing do not matter", () => {
  assert.equal(verifyQuote("REDUCE  greenhouse gas emissions by 15 percent", 2, pages).verified, true);
});

test("hyphenation across a line break", () => {
  assert.equal(verifyQuote("Drought-resistant wheat varieties will be distributed", 3, pages).verified, true);
  assert.equal(verifyQuote("Droughtresistant wheat varieties", 3, pages).verified, true);
});

test("typographic quotes and dashes", () => {
  assert.equal(verifyQuote('The "Green Economy" concept - adopted in 2013 - sets the long-term path', 4, pages).verified, true);
});

test("off by one page is accepted and the page corrected", () => {
  assert.deepEqual(verifyQuote("will be distributed to 5,000 farms by 2027", 2, pages), { verified: true, page: 3 });
});

test("printed page label", () => {
  // Printed page "3" is physical page 4; cited as 3 it is found on the off-by-one rule or the label rule.
  assert.deepEqual(verifyQuote("sets the long-term path", 3, pages), { verified: true, page: 4 });
});

test("elided quote: fragments in order", () => {
  assert.equal(verifyQuote("Exampleland commits to … below 1990 levels by 2030", 2, pages).verified, true);
  assert.equal(verifyQuote("below 1990 levels by 2030 ... Exampleland commits", 2, pages).verified, false);
});

test("altered or invented quotes fail", () => {
  assert.deepEqual(verifyQuote("reduce greenhouse gas emissions by 25 percent below 1990 levels", 2, pages), { verified: false, page: 2 });
  assert.equal(verifyQuote("The Government adopted this plan in 2020.", 1, pages).verified, false);
});

test("quote two pages away is not accepted", () => {
  assert.equal(verifyQuote("The Government of Exampleland adopted this plan", 3, pages).verified, false);
});

test("too short to verify", () => {
  assert.equal(verifyQuote("2030", 2, pages).verified, false);
  assert.equal(verifyQuote("", 2, pages).verified, false);
});

test("normalise", () => {
  assert.equal(normalise("  “Net‑zero”  by\n2060 "), "netzero by 2060");
});

test("locateQuote maps back to the original text", () => {
  const text = pages.get(3)!.text;
  const [[s, e]] = locateQuote(text, "Drought-resistant wheat varieties");
  assert.equal(text.slice(s, e), "Drought-\nresistant wheat varieties");
  const t4 = pages.get(4)!.text;
  const [[a, b]] = locateQuote(t4, '"Green Economy" concept');
  assert.equal(t4.slice(a, b), "Green Economy” concept");
  assert.deepEqual(locateQuote(text, "not on this page at all"), []);
});

test("negative numbers never match positive numbers, including whitespace and Unicode minus", () => {
  for (const negative of ["-2", "−2", "- 2", "−\n2", "–2"]) {
    const text = `The net change is ${negative} percent in 2030.`;
    const source = new Map([[1, { page: 1, label: null, text }]]);
    for (const quote of ["The net change is 2 percent in 2030.", "2 percent in 2030.", "The net change is … 2 percent in 2030.", "The net change is … 2 … percent in 2030."]) {
      assert.equal(verifyQuote(quote, 1, source).verified, false, `${negative}: ${quote}`);
      assert.deepEqual(locateQuote(text, quote), []);
    }
    assert.equal(verifyQuote("The net change is -2 percent in 2030.", 1, source).verified, true);
    const [[start, end]] = locateQuote(text, "-2 percent in 2030.");
    assert.equal(text.slice(start, end), `${negative} percent in 2030.`);
  }
  const positive = new Map([[1, { page: 1, label: null, text: "The net change is 2 percent in 2030." }]]);
  assert.equal(verifyQuote("The net change is −2 percent in 2030.", 1, positive).verified, false);
  assert.equal(verifyQuote("The net change is … −2 … percent in 2030.", 1, positive).verified, false);
  assert.equal(verifyQuote("The net change is 2 percent in 2030.", 1, positive).verified, true);
});

test("numeric fragments cannot match a suffix, decimal or range with its separator removed", () => {
  const source = new Map([[1, { page: 1, label: null, text: "Growth is 12 percent and the target is 2.5 percent; range 2–4 percent." }]]);
  assert.equal(verifyQuote("2 percent and the target", 1, source).verified, false);
  assert.equal(verifyQuote("Growth is 12 percent and the target is 2", 1, source).verified, false);
  assert.equal(verifyQuote("range 24 percent", 1, source).verified, false);
  assert.equal(verifyQuote("range 2-4 percent", 1, source).verified, true);
});
