// Build a read-only static snapshot of the app for GitHub Pages.
//
// The app renders every view on the server from SQLite and switches views with query strings,
// which a static host cannot do. So this builds the app in read-only mode, runs it locally against
// the current database, follows every link it renders, and saves each view as its own HTML file.
// scripts/static-nav.js (injected into every page) maps query-string links to those files.
//
//   node scripts/export-static.mjs [--base /PolicyTracker2] [--out out-static] [--depth 3] [--max 2500] [--skip-build]
//
// Views multiply (topic x metric x scale x stages x report), so the crawl keeps each country's main
// report and the default action stages, and stops --depth clicks away from the main pages. Other
// views open the closest saved one. Needs Node 22+ and the database from DATABASE_URL; the worker
// does not need to run. In Git Bash, prefix with MSYS_NO_PATHCONV=1 so --base stays a URL path.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s*--/).filter(Boolean).map(a => { const [k, ...v] = a.split(/\s+/); return [k, v.join(" ") || true]; }));
const BASE = (args.base ?? "/PolicyTracker2").replace(/\/$/, "");
const OUT = args.out ?? "out-static";
const MAX = Number(args.max ?? 2500);
const DEPTH = Number(args.depth ?? 3);
const PORT = Number(args.port ?? 3123);
const DIST = ".next-static";
const ORIGIN = `http://127.0.0.1:${PORT}`;
const NEXT = join("node_modules", "next", "dist", "bin", "next");
const env = {
  ...process.env,
  NEXT_PUBLIC_STATIC_DEMO: "1",
  NEXT_PUBLIC_BASE_PATH: BASE,
  NEXT_PUBLIC_SNAPSHOT_DATE: new Date().toISOString().slice(0, 10),
  NEXT_DIST_DIR: DIST,
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, { env, stdio: "inherit", ...opts });
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${argv.join(" ")} exited with ${code}`)));
  });
}

async function waitForServer(url, ms = 120_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { await fetch(url, { redirect: "manual" }); return; } catch { await new Promise(r => setTimeout(r, 500)); }
  }
  throw new Error(`Server did not start at ${url}`);
}

function mainReportIds() {
  const url = process.env.DATABASE_URL ?? readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
  const Database = createRequire(import.meta.url)("better-sqlite3");
  const db = new Database(url.replace(/^file:/, ""), { readonly: true });
  try { return new Set(db.prepare("SELECT mainReportId FROM Country WHERE mainReportId IS NOT NULL").all().map(r => r.mainReportId)); } finally { db.close(); }
}
const MAIN_REPORTS = mainReportIds();
const DEFAULT_STAGES = "1,2,3,4";

const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
const encode = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const short = s => createHash("sha1").update(s).digest("hex").slice(0, 12);

/** Resolve a link found on `from` to a crawlable key (base path + pathname + search), or null if external. */
function keyOf(raw, from) {
  if (!raw || /^(#|mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
  let url;
  try { url = new URL(raw, ORIGIN + from); } catch { return null; }
  if (url.origin !== ORIGIN) return null;
  let path = url.pathname;
  // Plain <a href="/api/..."> anchors skip next/link, so they miss the base path.
  if (path !== BASE && !path.startsWith(BASE + "/")) path = BASE + path;
  if (path.startsWith(BASE + "/_next/") || path.startsWith(BASE + "/_static/")) return null;
  if (path.length > BASE.length + 1) path = path.replace(/\/$/, "");
  // Same view, same file: parameter order and comma escaping vary between links (nav.js matches this).
  const params = [...url.searchParams].filter(([k]) => k !== "_rsc").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const search = params.length ? "?" + new URLSearchParams(params) : "";
  // The main report and the default stages are what the page shows without the parameter.
  const reports = params.filter(([k]) => k === "report").map(([, v]) => v);
  const stages = params.filter(([k]) => k === "stages").map(([, v]) => v).join(",");
  if (reports.some(id => !MAIN_REPORTS.has(id)) || (stages && stages !== DEFAULT_STAGES)) return null;
  const kept = params.filter(([k]) => k !== "report" && k !== "stages");
  const key = path + (kept.length ? "?" + new URLSearchParams(kept) : "");
  return { key, hash: url.hash, alias: key === path + search ? undefined : path + search };
}

const EXT = { "application/pdf": ".pdf", "application/json": ".json", "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico", "image/png": ".png", "image/svg+xml": ".svg", "text/plain": ".txt" };

const pages = new Map(); // key -> { url, html? }
const queue = [];
const files = new Map(); // content hash -> url
const aliases = new Map(); // equivalent URL -> key
const depths = new Map();
function enqueue(link, depth) {
  if (link.alias) aliases.set(link.alias, link.key);
  const isFile = link.key.startsWith(BASE + "/api/");
  if (pages.has(link.key) || (depth > DEPTH && !isFile) || pages.size >= MAX) return;
  pages.set(link.key, null);
  depths.set(link.key, depth);
  queue.push(link.key);
}

async function crawlOne(key) {
  const res = await fetch(ORIGIN + key, { redirect: "manual" });
  const rel = key.slice(BASE.length);
  const [pathname, search = ""] = rel.split("?");
  if (res.status >= 300 && res.status < 400) {
    const target = keyOf(res.headers.get("location"), key);
    if (target) enqueue(target, depths.get(key));
    pages.set(key, { redirect: target?.key, url: search ? `${BASE}${pathname.replace(/\/$/, "")}/q-${short(search)}.html` : `${BASE}${pathname.replace(/\/$/, "")}/` });
    return;
  }
  if (!res.ok) { pages.set(key, { missing: res.status }); console.warn(`  ${res.status} ${key}`); return; }
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (type === "text/html") {
    const html = await res.text();
    const url = search ? `${BASE}${pathname.replace(/\/$/, "")}/q-${short(search)}.html` : `${BASE}${pathname.replace(/\/$/, "")}/`;
    pages.set(key, { url, html });
    const depth = depths.get(key) + 1;
    for (const m of html.matchAll(/\s(?:href|src|action)="([^"]*)"/g)) { const k = keyOf(decode(m[1]), key); if (k) enqueue(k, depth); }
    // Links rendered by server components also appear in the flight payload.
    for (const m of html.matchAll(/\\"href\\":\\"(\/[^"\\]*)\\"/g)) { const k = keyOf(m[1].replace(/\\\\u0026/g, "&"), key); if (k) enqueue(k, depth); }
    return;
  }
  // Files (PDFs, JSON exports, icons) are stored once per content, however many URLs serve them.
  const body = Buffer.from(await res.arrayBuffer());
  const digest = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const name = pathname.split("/").filter(Boolean).slice(-2).join("-").replace(/[^\w.-]/g, "_");
  const ext = EXT[type] ?? "";
  const fileName = name.endsWith(ext) ? name : name + ext;
  if (!files.has(digest)) {
    const url = pathname === "/favicon.ico" && !search ? `${BASE}/favicon.ico` : `${BASE}/_files/${digest}/${fileName}`;
    const file = join(OUT, decodeURIComponent(url.slice(BASE.length)));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    files.set(digest, url);
  }
  pages.set(key, { url: files.get(digest), file: true });
}

function staticUrl(key, seen = new Set()) {
  const page = pages.get(key);
  if (!page || page.missing || seen.has(key)) return null;
  if (page.redirect) { seen.add(key); return staticUrl(page.redirect, seen) ?? page.url; }
  return page.url;
}

function rewrite(html, from) {
  return html.replace(/(\s(?:href|src|action)=")([^"]*)"/g, (all, attr, value) => {
    const raw = decode(value);
    const k = keyOf(raw, from);
    if (!k) return all;
    const target = staticUrl(k.key);
    if (!target) return all;
    return `${attr}${encode(attr.includes("action") ? target : target + k.hash)}"`;
  }).replace("<head>", `<head><script src="${BASE}/_static/nav.js"></script>`);
}

async function main() {
  if (!args["skip-build"]) {
    console.log(`Building read-only app (base path ${BASE})...`);
    await run([NEXT, "build"]);
  }
  console.log("Starting it locally...");
  const server = spawn(process.execPath, [NEXT, "start", "-p", String(PORT), "-H", "127.0.0.1"], { env, stdio: ["ignore", "ignore", "inherit"] });
  try {
    await waitForServer(`${ORIGIN}${BASE}/countries`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    for (const path of ["/", "/countries", "/methodology", "/runs", "/taxonomy", "/favicon.ico"]) enqueue({ key: BASE + path }, 0);
    let done = 0;
    const worker = async () => {
      while (queue.length) {
        const key = queue.shift();
        try { await crawlOne(key); } catch (error) { console.warn(`  failed ${key}: ${error.message}`); pages.set(key, { missing: 0 }); }
        if (++done % 50 === 0) console.log(`  ${done} fetched, ${queue.length} queued`);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    if (pages.size >= MAX) console.warn(`Stopped at --max ${MAX}; some views will fall back to their default state.`);

    const map = {};
    for (const [alias, key] of aliases) { const target = staticUrl(key); if (target) map[alias] = target; }
    for (const [key, page] of pages) {
      const target = staticUrl(key);
      if (target) map[key] = target;
      if (!page?.html) continue;
      const file = join(OUT, decodeURIComponent(page.url.slice(BASE.length)), page.url.endsWith("/") ? "index.html" : "");
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, rewrite(page.html, key));
    }
    // GitHub Pages serves the folder as is; without this, Jekyll drops _next/ and _files/.
    writeFileSync(join(OUT, ".nojekyll"), "");
    const notFound = await fetch(`${ORIGIN}${BASE}/__missing__`).then(r => r.text());
    writeFileSync(join(OUT, "404.html"), rewrite(notFound, `${BASE}/__missing__`));
    if (!existsSync(join(OUT, "index.html"))) writeFileSync(join(OUT, "index.html"), `<meta http-equiv="refresh" content="0; url=${BASE}/countries/">`);
    cpSync(join(DIST, "static"), join(OUT, "_next", "static"), { recursive: true });
    mkdirSync(join(OUT, "_static"), { recursive: true });
    cpSync(join("scripts", "static-nav.js"), join(OUT, "_static", "nav.js"));
    writeFileSync(join(OUT, "_static", "map.json"), JSON.stringify(map));
    const htmlCount = [...pages.values()].filter(p => p?.html).length;
    console.log(`Wrote ${htmlCount} pages and ${files.size} files to ${OUT}/`);
  } finally {
    server.kill();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
