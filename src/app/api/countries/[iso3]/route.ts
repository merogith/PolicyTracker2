import { deleteCountry } from "@/lib/countries";
import { respond } from "@/lib/errors";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/countries/[iso3]">) {
  return respond(async () => {
    const { iso3 } = await ctx.params;
    await deleteCountry(iso3.toUpperCase());
  });
}
