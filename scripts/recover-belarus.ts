import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { openai } from "../src/lib/openai";
import { loadTaxonomy } from "../src/lib/taxonomy";
import { enqueue } from "../src/lib/jobs";
import { checkCap, estimateDocumentDomain, estimateSynthesis } from "../src/lib/cost";
import { PROMPT_VERSION } from "../src/lib/analysis/prompt";

/** Scoped recovery of the audited failures and three known evidence/recall issues. */
async function main() {
  if (openai().fake) throw new Error("Belarus recovery requires live mode");
  const country = await db.country.findUniqueOrThrow({ where: { iso3: "BEL" } });
  const tax = await loadTaxonomy();
  const documents = await db.document.findMany({ where: { countryId: country.id, status: { not: "deleting" } }, include: { pages: true, results: true } });
  const issues = new Set(["BEL-NDC1:energy", "BEL-NDC1:waste", "BEL-NDC2:energy"]);
  const selected = documents.flatMap(doc => tax.domains.filter(d => d.enabled).flatMap(domain => {
    const result = doc.results.find(r => r.domainId === domain.id && r.domainVersion === domain.version);
    const reason = !result ? "missing" : result.status === "failed" ? "failed"
      : issues.has(`${doc.id}:${domain.id}`) ? "audited evidence/recall issue" : null;
    return reason ? [{ documentId: doc.id, domainId: domain.id, reason, mode: domain.maxResults === 0 ? "all_pages" : "search",
      estimateUsd: estimateDocumentDomain() }] : [];
  }));
  const domains = [...new Set(selected.map(p => p.domainId))];
  const estimateUsd = selected.reduce((sum, p) => sum + p.estimateUsd, 0) + domains.length * estimateSynthesis(documents.length);
  const cap = checkCap(estimateUsd);
  if (cap) throw new Error(cap);
  const plan = { at: new Date().toISOString(), promptVersion: PROMPT_VERSION, selected, summaryDomains: domains, estimateUsd };
  console.log(JSON.stringify(plan, null, 2));
  if (!process.argv.includes("--apply")) return;
  if (await db.job.count({ where: { countryId: country.id, status: { in: ["queued", "running"] } } })) throw new Error("Belarus already has active work; do not duplicate it");
  mkdirSync("output/belarus-repair", { recursive: true });
  writeFileSync(`output/belarus-repair/pre-rerun-${Date.now()}.json`, JSON.stringify(documents.map(d => ({ id: d.id, results: d.results }))));
  const jobs = await db.$transaction(async tx => {
    const ids: string[] = [];
    for (const item of selected) {
      const previous = await tx.job.findFirst({ where: { documentId: item.documentId, domainId: item.domainId, type: "analyse_document_domain", status: "failed" }, orderBy: { createdAt: "desc" } });
      if (previous) {
        await tx.job.update({ where: { id: previous.id }, data: { status: "queued", attempts: 0, error: null, startedAt: null, finishedAt: null, runAfter: new Date() } });
        ids.push(previous.id);
      } else {
        ids.push((await enqueue("analyse_document_domain", { documentId: item.documentId, domainId: item.domainId }, { countryId: country.id, tx })).id);
      }
    }
    await tx.document.updateMany({ where: { id: { in: [...new Set(selected.map(p => p.documentId))] } }, data: { status: "analysing", error: null } });
    for (const domainId of domains) ids.push((await enqueue("synthesise_country_domain", { countryId: country.id, domainId }, { tx, runAfter: new Date(Date.now() + 3000) })).id);
    return ids;
  });
  writeFileSync("output/belarus-repair/rerun-plan.json", JSON.stringify({ ...plan, jobs }, null, 2));
  console.log(`Queued ${selected.length} document analyses and ${domains.length} summaries.`);
}
main().catch(e => { console.error(String(e)); process.exitCode = 1; }).finally(() => db.$disconnect());
