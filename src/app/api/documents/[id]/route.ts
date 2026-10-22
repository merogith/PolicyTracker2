import { deleteDocument } from "@/lib/documents";
import { respond } from "@/lib/errors";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    await deleteDocument(id);
  });
}
