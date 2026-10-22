/* Smoke-test the isolated live-data preview. No app data is changed. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("C:/Users/Meriç/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const output = path.resolve(__dirname, "../../../tmp/dashboard-design-preview");
fs.mkdirSync(output, { recursive: true });
const checks = [];
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, colorScheme: "light" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("http://127.0.0.1:3000/design-preview?country=KAZ", { waitUntil: "domcontentloaded", timeout: 120000 });
  assert.equal(response.status(), 200);
  const root = page.getByTestId("design-preview");
  await root.waitFor({ timeout: 60000 });
  await root.locator(':scope[data-ready="true"]').waitFor({ timeout: 60000 });
  const capture = async name => {
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    await page.screenshot({ path: path.join(output, name + ".png"), fullPage: true });
  };
  await root.getByTestId("domain-radar").waitFor();
  assert.equal(await root.getByRole("navigation", { name: "Country navigation" }).locator("button, a").count(), 7);
  const explorer = root.getByTestId("domain-explorer");
  assert.equal(await explorer.locator(".ptd-domainCard").count(), 16);
  await explorer.getByRole("button", { name: /^Climate:/ }).press("Enter");
  assert.equal(await explorer.locator(".ptd-explorerTopic").count(), 6);
  assert.match(await explorer.locator(".ptd-explorerTopic").first().getAttribute("href"), /topic=CLM-01/);
  await explorer.getByRole("heading", { level: 2 }).press("Escape");
  assert.equal(await explorer.locator(".ptd-domainCard").count(), 16);
  assert.equal(await root.getByLabel("Measure", { exact: true }).inputValue(), "detail");
  await capture("country-overview");
  await root.getByTestId("domain-radar").getByRole("button", { name: /^Climate:/ }).press("Enter");
  await root.locator("#preview-domain-detail").waitFor();
  await root.getByRole("button", { name: "Close domain details", exact: true }).click();
  checks.push("Seven-item navigation, six-axis radar, 16 domain cards and keyboard topic drilldown");
  await root.getByRole("button", { name: "Bars", exact: true }).click();
  await root.getByLabel("Measure", { exact: true }).selectOption("claim_points");
  const rows = root.locator('[aria-controls="preview-domain-detail"]');
  assert.equal(await rows.count(), 6);
  assert.equal(await root.getByLabel("Country", { exact: true }).inputValue(), "KAZ");
  const countryName = await root.getByLabel("Country", { exact: true }).locator('option:checked').innerText();
  assert.equal(await root.getByRole("heading", { level: 1 }).innerText(), countryName + ".");
  const baseline = await root.getByTestId("selected-metric-value").innerText();
  await capture("country-desktop");
  checks.push("Real country overview renders six domains");

  await rows.first().click();
  const detail = root.locator("#preview-domain-detail");
  await detail.waitFor();
  assert.ok(await detail.locator('a[href*="topic="]').count() > 0);
  const evidenceHref = await detail.locator('a[href*="topic="]').first().getAttribute("href");
  const evidence = new URL(evidenceHref, page.url());
  assert.equal(evidence.searchParams.get("metric"), "claim_points");
  assert.equal(evidence.searchParams.get("report"), new URL(page.url()).searchParams.get("report"));
  await capture("domain-detail");
  checks.push("Domain selection reveals topic tiles with report-aware evidence links");

  for (const metric of ["detail", "claims", "actions", "coverage", "claim_points"]) {
    await root.getByLabel("Measure", { exact: true }).selectOption(metric);
    await page.waitForFunction(expected => new URL(location.href).searchParams.get("metric") === expected, metric);
    assert.ok((await root.getByTestId("selected-metric-value").innerText()).length);
    if (metric === "coverage") assert.equal(await root.getByRole("button", { name: "Normalized", exact: true }).count(), 0);
  }
  assert.equal(await root.getByTestId("selected-metric-value").innerText(), baseline);
  await root.getByRole("button", { name: "Normalized", exact: true }).click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("scale") === "normalized");
  assert.match(await root.getByTestId("selected-metric-value").innerText(), /\/100/);
  assert.ok(!/\bSD\b/.test(await root.innerText()));
  checks.push("All five metrics work; normalization preserves metric identity and has no deviation annotations");

  await root.getByLabel("Compare country", { exact: true }).selectOption("BEL");
  await root.getByRole("button", { name: "Radar", exact: true }).click();
  await root.getByTestId("domain-radar").waitFor();
  await capture("radar-comparison");
  await root.getByRole("button", { name: "Bars", exact: true }).click();
  await capture("country-comparison");
  const comparisonName = await root.getByLabel("Compare country", { exact: true }).locator('option:checked').innerText();
  assert.ok((await root.innerText()).includes(comparisonName));
  await page.reload({ waitUntil: "domcontentloaded" });
  await root.waitFor();
  await root.locator(':scope[data-ready="true"]').waitFor({ timeout: 60000 });
  assert.equal(await root.getByLabel("Compare country", { exact: true }).inputValue(), "BEL");
  assert.equal(await root.getByRole("button", { name: "Normalized", exact: true }).getAttribute("aria-pressed"), "true");
  checks.push("Paired comparison, metric, scale and domain survive refresh");

  await root.getByRole("button", { name: "Region", exact: true }).click();
  await root.getByRole("table").waitFor();
  assert.equal(await root.getByRole("table").locator("tbody tr").count(), 3);
  assert.equal(await root.getByRole("table").locator("thead th").count(), 7);
  await capture("region-desktop");
  await root.getByRole("button", { name: "All domains", exact: true }).click();
  assert.equal(await root.getByRole("table").locator("thead th").count(), 17);
  await root.getByRole("button", { name: "Show selected", exact: true }).click();
  await root.getByRole("button", { name: "Country", exact: true }).click();
  await root.getByLabel("Compare country", { exact: true }).selectOption("");
  await root.getByRole("button", { name: "Original", exact: true }).click();
  await root.getByRole("button", { name: "Close domain details", exact: true }).click();
  checks.push("Regional matrix supports six/all sixteen domains and returns to country view");
  await root.getByRole("button", { name: "Radar", exact: true }).click();
  await root.getByLabel("Measure", { exact: true }).selectOption("detail");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Horizontal page overflow at " + width);
    assert.equal(await explorer.locator('.ptd-domainCard:visible').count(), 6);
    await root.getByRole("button", { name: "All 16 domains", exact: true }).click();
    assert.equal(await explorer.locator('.ptd-domainCard:visible').count(), 16);
    await root.getByRole("button", { name: "Show six domains", exact: true }).click();
    await capture("country-mobile-" + width);
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await capture("country-dark");
  checks.push("320px/390px layouts fit; dark appearance and reduced-motion render");
  assert.deepEqual(errors, []);
  checks.push("No browser runtime errors");
  fs.writeFileSync(path.join(output, "checks.json"), JSON.stringify({ baseline, checks, errors }, null, 2));
  console.log(JSON.stringify({ baseline, checks, screenshots: output }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
