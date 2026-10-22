import { respond } from "@/lib/errors";
import { retireDomain, updateDomain, type DomainInput } from "@/lib/taxonomy-edit";

export async function PATCH(req: Request, ctx: RouteContext<"/api/taxonomy/domains/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = (await req.json()) as DomainInput & { preview?: boolean };
    return updateDomain(id, body, Boolean(body.preview));
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/taxonomy/domains/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { preview?: boolean };
    return retireDomain(id, Boolean(body.preview));
  });
}
