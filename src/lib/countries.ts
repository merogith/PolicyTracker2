import { db } from "./db";
import { ISO3_PATTERN } from "./domain";
import { enqueue } from "./jobs";
import { UserError } from "./errors";
import { openai } from "./openai";

export async function createCountry(input: { iso3: string; name: string }) {
  const iso3 = input.iso3.trim().toUpperCase();
  const name = input.name.trim();
  if (!ISO3_PATTERN.test(iso3)) throw new UserError("ISO3 code must be three letters, e.g. KAZ");
  if (!name) throw new UserError("Name is required");
  if (await db.country.findUnique({ where: { iso3 } })) throw new UserError(`Country ${iso3} already exists`, 409);

  const vectorStoreId = await openai().createVectorStore(`policy-tracker-${iso3.toLowerCase()}`, { iso3 });
  try {
    return await db.country.create({ data: { iso3, name, vectorStoreId, docCounters: {} } });
  } catch (err) {
    await openai().deleteVectorStore(vectorStoreId);
    throw err;
  }
}

/** Mark the country as deleting and queue the clean-up at OpenAI and in the database. */
export async function deleteCountry(iso3: string) {
  const country = await db.country.findUnique({ where: { iso3 } });
  if (!country) throw new UserError(`No country ${iso3}`, 404);
  await db.$transaction(async (tx) => {
    await tx.country.update({ where: { id: country.id }, data: { status: "deleting" } });
    await tx.document.updateMany({ where: { countryId: country.id }, data: { status: "deleting" } });
    await tx.job.updateMany({ where: { countryId: country.id, status: "queued" }, data: { status: "cancelled", finishedAt: new Date() } });
    await enqueue("delete_country", { countryId: country.id }, { tx });
  });
}

export function getCountry(iso3: string) {
  return db.country.findFirst({ where: { iso3: iso3.toUpperCase(), status: "active" } });
}
