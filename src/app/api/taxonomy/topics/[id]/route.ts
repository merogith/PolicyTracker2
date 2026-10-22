import { respond } from "@/lib/errors";
import { retireTopic, updateTopic, type TopicInput } from "@/lib/taxonomy-edit";

export async function PATCH(req: Request, ctx: RouteContext<"/api/taxonomy/topics/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = (await req.json()) as TopicInput & { preview?: boolean };
    return updateTopic(id, body, Boolean(body.preview));
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/taxonomy/topics/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { replacedBy?: string[]; preview?: boolean };
    return retireTopic(id, body.replacedBy ?? [], Boolean(body.preview));
  });
}
