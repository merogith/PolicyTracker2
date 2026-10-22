import { respond, UserError } from "@/lib/errors";
import { retryJob } from "@/lib/jobs";

export async function POST(_req: Request, ctx: RouteContext<"/api/jobs/[id]/retry">) {
  return respond(async () => {
    const { id } = await ctx.params;
    await retryJob(id).catch((err: Error) => {
      throw new UserError(err.message);
    });
  });
}
