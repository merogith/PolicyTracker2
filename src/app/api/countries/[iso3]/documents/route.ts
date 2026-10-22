import { createDocument } from "@/lib/documents";
import { respond, UserError } from "@/lib/errors";

export async function POST(req: Request, ctx: RouteContext<"/api/countries/[iso3]/documents">) {
  return respond(async () => {
    const { iso3 } = await ctx.params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new UserError("Choose a PDF file");
    const doc = await createDocument({
      iso3,
      title: String(form.get("title") ?? ""),
      kind: String(form.get("kind") ?? ""),
      editionDate: String(form.get("editionDate") ?? ""),
      language: form.get("language") ? String(form.get("language")) : null,
      originalName: file.name,
      data: Buffer.from(await file.arrayBuffer()),
    });
    return { id: doc.id, pageCount: doc.pageCount, estimateUsd: doc.estimateUsd };
  });
}
