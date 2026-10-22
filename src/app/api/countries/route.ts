import { createCountry } from "@/lib/countries";
import { respond } from "@/lib/errors";

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json()) as { iso3?: string; name?: string };
    const country = await createCountry({ iso3: body.iso3 ?? "", name: body.name ?? "" });
    return { iso3: country.iso3 };
  });
}
