import "dotenv/config";
import { db } from "../src/lib/db";
import { saveCountryReport } from "../src/lib/reports";

async function main() {
  for (const country of await db.country.findMany({ where: { status: "active" } })) {
    const report = await saveCountryReport(country.id, process.argv.includes("--baseline") ? "Original analysis" : undefined);
    console.log(JSON.stringify({ country: country.iso3, report: report?.id ?? null, title: report?.title }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
