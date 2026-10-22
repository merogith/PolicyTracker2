import { getCountry } from "@/lib/countries";
import { respond, UserError } from "@/lib/errors";
import { listReports, setMainReport } from "@/lib/reports";

type Context = { params: Promise<{ iso3: string }> };
export async function GET(_req: Request, ctx: Context) {
  return respond(async () => {
    const country = await getCountry((await ctx.params).iso3);
    if (!country) throw new UserError("Country not found", 404);
    return { mainReportId: country.mainReportId, reports: await listReports(country.id) };
  });
}
export async function PATCH(req: Request, ctx: Context) {
  return respond(async () => {
    const country = await getCountry((await ctx.params).iso3);
    if (!country) throw new UserError("Country not found", 404);
    const body = await req.json();
    if (typeof body?.reportId !== "string" || !body.reportId) throw new UserError("Choose a report");
    return setMainReport(country.id, body.reportId);
  });
}
