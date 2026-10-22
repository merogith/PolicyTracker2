import { respond } from "@/lib/errors";
import { rerunDomain } from "@/lib/taxonomy-edit";

export async function POST(_req: Request, ctx: RouteContext<"/api/taxonomy/domains/[id]/rerun">) {
  return respond(async () => {
    const { id } = await ctx.params;
    return rerunDomain(id);
  });
}
