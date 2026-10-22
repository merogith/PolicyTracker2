// The acceptance scenario of docs/IMPLEMENTATION.md Part 9, run against a running app and worker.
// Domains replaced analysis keys (2026-10-18), so steps 5 and 6 add a domain and edit a topic.
//
//   npm run db:migrate && npm run db:seed        # on a fresh database
//   npm run dev  &  npm run worker               # in two terminals
//   npx tsx scripts/scenario.ts --base http://localhost:3000 --iso3 KAZ --name Kazakhstan \
//     --doc "path/to/ndc3.pdf|NDC|2025-11-26|NDC 3.0" --doc "path/to/nap.pdf|NAP|2024-12-01|National Adaptation Plan"
//
// The second --doc is the one deleted in step 7. Uses the same DATABASE_URL and OpenAI settings as the app.
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { openai } from "../src/lib/openai";
import { loadTaxonomy } from "../src/lib/taxonomy";

function args(name: string) {
  const out: string[] = [];
  process.argv.forEach((a, i) => a === name && process.argv[i + 1] && out.push(process.argv[i + 1]));
  return out;
}
const base = args("--base")[0] ?? "http://localhost:3000";
const iso3 = (args("--iso3")[0] ?? "KAZ").toUpperCase();
const name = args("--name")[0] ?? "Kazakhstan";
const docs = args("--doc").map((d) => {
  const [file, kind, editionDate, title] = d.split("|");
  return { file, kind, editionDate, title: title ?? path.basename(file) };
});
const timeoutMin = Number(args("--timeout-min")[0] ?? 60);

let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `: ${detail}` : ""}`);
}

async function api(method: string, url: string, body?: unknown | FormData) {
  const res = await fetch(base + url, {
    method,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    headers: body instanceof FormData || body === undefined ? undefined : { "content-type": "application/json" },
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
  return json as Record<string, unknown>;
}

async function waitIdle(label: string) {
  const started = Date.now();
  for (;;) {
    const pending = await db.job.count({ where: { status: { in: ["queued", "running"] } } });
    if (pending === 0) return (Date.now() - started) / 1000;
    if (Date.now() - started > timeoutMin * 60_000) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function main() {
  if (docs.length < 2) throw new Error("Give two --doc arguments");

  // 1. Fresh database with the seeded taxonomy.
  const existing = await db.country.count();
  const tax = await loadTaxonomy();
  const domains = tax.domains.filter((d) => d.enabled);
  const n = domains.length;
  check(existing === 0, "1. fresh database (no countries yet)", `${existing} countries`);
  check(n === 16 && tax.topics.length === 64, "1. taxonomy seeded: 16 domains, 64 topics", `${n} domains, ${tax.topics.length} topics`);

  // 2. Country and uploads.
  await api("POST", "/api/countries", { iso3, name });
  const country = await db.country.findUniqueOrThrow({ where: { iso3 } });
  check(!!country.vectorStoreId, "2. country created with a vector store", country.vectorStoreId ?? "none");
  const ids: string[] = [];
  for (const d of docs) {
    const form = new FormData();
    form.set("file", new Blob([readFileSync(d.file)], { type: "application/pdf" }), path.basename(d.file));
    form.set("title", d.title);
    form.set("kind", d.kind);
    form.set("editionDate", d.editionDate);
    const res = await api("POST", `/api/countries/${iso3}/documents`, form);
    ids.push(res.id as string);
    console.log(`      uploaded ${res.id}: ${res.pageCount} pages, estimated $${Number(res.estimateUsd).toFixed(2)}`);
  }

  // 3. Analysed with no manual action; no failed jobs.
  const secs = await waitIdle("analysis");
  const statuses = await db.document.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, error: true } });
  check(statuses.every((s) => s.status === "analysed"), "3. both documents analysed", statuses.map((s) => `${s.id}=${s.status}${s.error ? ` (${s.error})` : ""}`).join(", ") + ` after ${secs.toFixed(0)} s`);
  const failed = await db.job.findMany({ where: { status: "failed" } });
  check(failed.length === 0, "3. no failed jobs on /runs", failed.map((j) => `${j.type} ${j.documentId ?? ""} ${j.domainId ?? ""}: ${j.error}`).join("; "));

  // 4. Cards, summaries, citations, verified rate, topics and views.
  for (const id of ids) {
    const done = await db.analysisResult.count({ where: { documentId: id, status: "done" } });
    check(done === n, `4. one answer per domain for ${id}`, `${done} of ${n}`);
  }
  const summaries = await db.analysisResult.count({ where: { countryId: country.id, scope: "country", status: "done" } });
  check(summaries === n, "4. one country summary per domain", `${summaries} of ${n}`);
  const cardsOn = async (tab: string) => ((await (await fetch(`${base}/countries/${iso3}?tab=${tab}`)).text()).match(/<article/g) ?? []).length;
  for (const id of ids) {
    const c = await cardsOn(id);
    check(c === n, `4. country page tab ${id} shows a card per domain`, `${c}`);
  }
  const summaryCards = await cardsOn("summary");
  check(summaryCards === n, "4. country page shows a combined summary per domain", `${summaryCards}`);
  const overview = (await (await fetch(`${base}/countries/${iso3}?tab=overview`)).text()).replaceAll("<!-- -->", "");
  check(
    overview.includes("Domain dashboard") && overview.includes("What each document covers") && overview.includes("Reading the score") && overview.includes("Targets and figures"),
    "4. overview tab shows the domain dashboard, coverage, figures and score reading",
  );
  const topicsView = (await (await fetch(`${base}/countries/${iso3}?tab=domains&view=topics`)).text()).replaceAll("<!-- -->", "");
  check(topicsView.includes("Topic status") && (topicsView.match(/topic=[A-Z]{3}-\d{2}/g) ?? []).length >= 64, "4. topic status lists all 64 topics");
  const matrix = (await (await fetch(`${base}/countries`)).text()).replaceAll("<!-- -->", "");
  check(matrix.includes("Countries × domains"), "4. countries page shows the country × domain matrix");
  const cites = await db.citation.findMany({ where: { result: { scope: "document", countryId: country.id } } });
  const verified = cites.filter((c) => c.verified).length;
  const rate = cites.length ? verified / cites.length : 0;
  check(rate > 0.9, "4. verified citation rate above 90%", `${verified}/${cites.length} = ${(100 * rate).toFixed(1)}%`);
  const findings = (await db.analysisResult.findMany({ where: { countryId: country.id, scope: "document", status: "done" } })).flatMap(
    (r) => ((r.output as { findings?: Array<{ topic_ids?: string[] }> }).findings ?? []),
  );
  const withTopics = findings.filter((i) => (i.topic_ids ?? []).length > 0).length;
  check(findings.length > 0 && findings.every((i) => Array.isArray(i.topic_ids)), "4. every document finding carries topic tags", `${withTopics}/${findings.length} with at least one topic`);
  const domainsTab = (await (await fetch(`${base}/countries/${iso3}?tab=domains`)).text()).replaceAll("<!-- -->", "");
  check(domainsTab.includes("Domain profiles") && domainsTab.includes("Domains per document"), "4. the Domains & topics tab shows its views");
  const sample = cites.find((c) => c.verified);
  if (sample) {
    // React separates text parts with <!-- --> in server HTML.
    const page = (await (await fetch(`${base}/countries/${iso3}/documents/${sample.documentId}?page=${sample.page}&cite=${sample.id}`)).text()).replaceAll("<!-- -->", "");
    const shown = page.match(/Page (\d+)\s*<span[^>]*>of \d+/)?.[1];
    check(shown === String(sample.page) && page.includes("<mark"), "4. a citation opens the page viewer at its page with the quote marked", `${sample.documentId} p. ${sample.page}, viewer shows p. ${shown}`);
  }

  // 5. Add a domain with a topic: only that domain is asked; stored answers are only re-tagged.
  const before = await db.job.count();
  await api("POST", "/api/taxonomy/domains", {
    id: "cryosphere",
    prefix: "CRY",
    label: "Glaciers and cryosphere",
    definition: "Glaciers, snow cover and permafrost: observed change, glacier-fed water, glacial-lake outburst risk and their monitoring.",
    groups: [{ id: "change", label: "Change and monitoring" }],
  });
  const topic = (await api("POST", "/api/taxonomy/topics", {
    label: "Glacier retreat and monitoring",
    definition: "Observed glacier and snowpack change, glacier monitoring networks and mass-balance measurement.",
    placements: [{ domain: "cryosphere", group: "change" }],
  })) as { id: string };
  check(topic.id === "CRY-01", "5. the new topic gets the next ID under the domain's prefix", topic.id);
  await waitIdle("the new domain");
  const added = await db.job.findMany({ orderBy: { createdAt: "asc" }, skip: before });
  const analyses = added.filter((j) => j.type === "analyse_document_domain");
  const summariesRun = added.filter((j) => j.type === "synthesise_country_domain");
  const retags = added.filter((j) => j.type === "retag_result");
  check(
    analyses.length > 0 && analyses.every((j) => j.domainId === "cryosphere") && summariesRun.every((j) => j.domainId === "cryosphere"),
    "5. adding a domain asks only that domain, for both documents and the country",
    `${analyses.length} analyses, ${summariesRun.length} summaries, all cryosphere`,
  );
  check(retags.length > 0 && added.every((j) => j.status === "done" || j.status === "cancelled"), "5. other answers are only re-tagged", `${retags.length} re-tags`);
  const newAnswers = await db.analysisResult.count({ where: { domainId: "cryosphere", scope: "document", status: "done" } });
  check(newAnswers === ids.length, "5. the new domain has an answer per document", `${newAnswers}`);

  // 6. Edit a topic's definition: nothing is asked again, answers are re-tagged.
  const before6 = await db.job.count();
  await api("PATCH", "/api/taxonomy/topics/WAT-05", { definition: "Glaciers, snowpack and permafrost as water sources: their change, monitoring and management." });
  await waitIdle("the re-tag");
  const after6 = await db.job.findMany({ orderBy: { createdAt: "asc" }, skip: before6 });
  check(after6.length > 0 && after6.every((j) => j.type === "retag_result"), "6. a definition edit only re-tags", `${after6.length} jobs: ${[...new Set(after6.map((j) => j.type))].join(", ")}`);
  const taxNow = await loadTaxonomy();
  const pendingRetag = await db.analysisResult.count({ where: { scope: "document", status: "done", taxonomyVersion: { not: taxNow.version }, domain: { retiredAt: null } } });
  check(pendingRetag === 0, "6. every current answer carries the new taxonomy version", `${pendingRetag} left`);

  // 7. Delete the second document.
  const victim = ids[1];
  const pageFiles = (await db.page.findMany({ where: { documentId: victim, openaiFileId: { not: null } } })).map((p) => p.openaiFileId!);
  const before7 = await db.job.count();
  await api("DELETE", `/api/documents/${victim}`);
  await waitIdle("the deletion");
  const left = await db.analysisResult.count({ where: { documentId: victim } });
  check(left === 0, `7. ${victim}'s results disappear`, `${left} left`);
  const rerun = await db.job.findMany({ orderBy: { createdAt: "asc" }, skip: before7 });
  const synth = rerun.filter((j) => j.type === "synthesise_country_domain" && j.status === "done").length;
  const active = await db.domain.count({ where: { enabled: true, retiredAt: null } });
  check(synth === active, "7. the country summaries re-run", `${synth} of ${active}`);
  const inStore = new Set((await openai().listStoreFiles(country.vectorStoreId!)).map((f) => f.id));
  const still = pageFiles.filter((f) => inStore.has(f));
  check(still.length === 0, "7. the vector store no longer lists its page files", `${still.length} of ${pageFiles.length} still listed; store has ${inStore.size} files`);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures ? 1 : 0;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
