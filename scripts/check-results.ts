// Validates every stored answer against its schema and reports, per domain, the verified-citation
// rate, topic tagging and cost. Usage: tsx scripts/check-results.ts [--country ISO3] [--show domain-id]
// Exits with 1 when a stored answer does not validate.
import "dotenv/config";
import { isCurrentEvidencePrompt } from "../src/lib/analysis/prompt";
import { storedSchemaFor, type Scope } from "../src/lib/analysis/schemas";
import { db } from "../src/lib/db";
import { loadTaxonomy } from "../src/lib/taxonomy";

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function pct(n: number, d: number) {
  return d === 0 ? "   –  " : `${((100 * n) / d).toFixed(1).padStart(5)}%`;
}

async function main() {
  const iso3 = arg("--country")?.toUpperCase();
  const show = arg("--show");
  const country = iso3 ? await db.country.findUnique({ where: { iso3 } }) : null;
  if (iso3 && !country) throw new Error(`No country ${iso3}`);

  const tax = await loadTaxonomy();
  const results = await db.analysisResult.findMany({ where: country ? { countryId: country.id } : {}, include: { citations: true } });

  let invalid = 0;
  let outdated = 0;
  let findings = 0;
  let tagged = 0;
  let retag = 0;
  for (const r of results.filter((r) => r.status === "done")) {
    const parsed = storedSchemaFor(r.scope as Scope).safeParse(r.output);
    if (!parsed.success) {
      if (!isCurrentEvidencePrompt(r.promptVersion)) {
        outdated++;
        continue;
      }
      invalid++;
      console.log(`INVALID ${r.domainId} v${r.domainVersion} ${r.slot}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
      continue;
    }
    if (r.scope === "document") {
      if (r.taxonomyVersion !== tax.version) retag++;
      for (const f of ((r.output as { findings?: Array<{ topic_ids?: string[] }> }).findings ?? [])) {
        findings++;
        if ((f.topic_ids ?? []).length > 0) tagged++;
      }
    }
  }

  console.log(
    `\n${results.length} answers (${results.filter((r) => r.status === "done").length} done, ${results.filter((r) => r.status === "failed").length} failed), ${invalid} invalid, ${outdated} from an earlier prompt version (re-run to refresh)`,
  );
  console.log(`taxonomy ${tax.version}: ${tagged}/${findings} document findings carry at least one topic${findings ? ` (${((100 * tagged) / findings).toFixed(1)}%)` : ""}; ${retag} answer(s) wait for a re-tag\n`);
  console.log("domain                       ver  docs done/failed/stale  country  citations  verified   not found  cost USD");
  let totalC = 0;
  let totalV = 0;
  let totalCost = 0;
  for (const d of tax.domains) {
    const mine = results.filter((r) => r.domainId === d.id);
    const doc = mine.filter((r) => r.scope === "document");
    const current = doc.filter((r) => r.domainVersion === d.version);
    const stale = doc.filter((r) => r.domainVersion < d.version && r.status === "done").length;
    const countryDone = mine.filter((r) => r.scope === "country" && r.domainVersion === d.version && r.status === "done").length;
    const cites = current.filter((r) => r.status === "done").flatMap((r) => r.citations);
    const verified = cites.filter((c) => c.verified).length;
    const notFound = current.filter((r) => r.status === "done" && (r.output as { not_found?: boolean })?.not_found).length;
    const cost = mine.reduce((s, r) => s + r.costUsd, 0);
    totalC += cites.length;
    totalV += verified;
    totalCost += cost;
    console.log(
      `${d.id.padEnd(28)} ${String(d.version).padStart(3)}  ${String(current.filter((r) => r.status === "done").length).padStart(4)}/${current.filter((r) => r.status === "failed").length}/${stale}`.padEnd(56) +
        `${String(countryDone).padStart(4)}  ${String(cites.length).padStart(9)}  ${String(verified).padStart(4)} ${pct(verified, cites.length)}  ${String(notFound).padStart(5)}  ${cost.toFixed(4).padStart(9)}` +
        (d.enabled ? "" : "  (not asked)"),
    );
  }
  console.log(`\nverified citation rate (document answers, current domain versions): ${totalV}/${totalC} = ${pct(totalV, totalC).trim()}`);
  console.log(`total cost recorded: $${totalCost.toFixed(4)}`);

  if (show) {
    for (const r of results.filter((r) => r.domainId === show && r.status === "done")) {
      console.log(`\n--- ${show} v${r.domainVersion} ${r.slot}`);
      console.log(JSON.stringify(r.output, null, 1).slice(0, 4000));
      for (const c of r.citations) console.log(`  [${c.verified ? "ok" : "UNVERIFIED"}] ${c.itemPath || "(top)"} ${c.documentId} p.${c.page}${c.page !== c.citedPage ? ` (cited ${c.citedPage})` : ""}: ${c.quote.slice(0, 100)}`);
    }
  }
  process.exitCode = invalid > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
