import { getCountry } from "@/lib/countries";
import { buildCurrentExport } from "@/lib/country-export";
import { readReport } from "@/lib/report-reader";
import { UserError } from "@/lib/errors";

export async function GET(req: Request, ctx: RouteContext<"/api/countries/[iso3]/export.json">) {
  const { iso3 } = await ctx.params;
  const country = await getCountry(iso3);
  if (!country) return Response.json({ error: `No country ${iso3}` }, { status: 404 });
  try {
    const report = await readReport(country.id, new URL(req.url).searchParams.get("report") ?? undefined);
    const body = report ? { ...report.data.export, report: { id: report.id, title: report.title, created_at: report.createdAt } } : await buildCurrentExport(country);
    return new Response(JSON.stringify(body, null, 2), { headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${country.iso3}-${report?.id ?? "export"}.json"`,
    } });
  } catch (error) {
    if (error instanceof UserError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
