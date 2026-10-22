// Seeds the taxonomy (domains and topics) from fresh-start/config/taxonomy.json when the database has
// none, so edits made in the dashboard are never overwritten. Documents that have no domain answers
// yet (for example after the migration from analysis keys) are queued for analysis.
import "dotenv/config";
import { db } from "../src/lib/db";
import { enqueue } from "../src/lib/jobs";
import { loadTaxonomy, seedTaxonomyFromFile } from "../src/lib/taxonomy";

async function main() {
  await db.$executeRawUnsafe("PRAGMA journal_mode=WAL");
  const seeded = await seedTaxonomyFromFile();
  const tax = await loadTaxonomy();
  console.log(
    seeded.created
      ? `seed: taxonomy ${tax.version} created with ${tax.domains.length} domains and ${tax.topics.length} topics`
      : `seed: taxonomy ${tax.version} already present (${tax.domains.length} domains, ${tax.topics.length} topics); left as is`,
  );

  const waiting = await db.document.findMany({
    where: { status: { in: ["analysing", "analysed"] }, results: { none: {} }, country: { status: "active" } },
  });
  for (const doc of waiting) {
    await db.document.update({ where: { id: doc.id }, data: { status: "analysing" } });
    for (const d of tax.domains.filter((x) => x.enabled)) {
      await enqueue("analyse_document_domain", { documentId: doc.id, domainId: d.id }, { countryId: doc.countryId });
      await enqueue("synthesise_country_domain", { countryId: doc.countryId, domainId: d.id }, { runAfter: new Date(Date.now() + 5000) });
    }
  }
  if (waiting.length) console.log(`seed: queued ${waiting.length} document(s) for analysis by domain; start the worker to run them`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
