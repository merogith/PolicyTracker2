import { db } from "@/lib/db";
import { readPdf } from "@/lib/storage";
import { readReport, reportDocument } from "@/lib/report-reader";

export async function GET(req: Request, ctx: RouteContext<"/api/documents/[id]/pdf">) {
  const { id } = await ctx.params;
  const reportId = new URL(req.url).searchParams.get("report");
  if (reportId) {
    const row = await db.countryReport.findFirst({ where: { id: reportId, country: { status: "active" } }, select: { countryId: true } });
    if (!row) return new Response("Report not found", { status: 404 });
    const report = await readReport(row.countryId, reportId);
    const saved = report && reportDocument(report.data, id);
    if (!saved || !/^[a-f0-9]{64}$/.test(saved.sha256)) return new Response("Document not in this report", { status: 404 });
    const data = await readPdf(`report-sources/${saved.sha256}.pdf`);
    return new Response(new Uint8Array(data), { headers: {
      "content-type": "application/pdf",
      "content-disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${saved.id}.pdf"`,
    } });
  }
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.status === "deleting") return new Response("Not found", { status: 404 });
  const data = await readPdf(doc.pdfPath);
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${doc.id}.pdf"`,
    },
  });
}
