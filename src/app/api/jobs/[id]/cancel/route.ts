import { refreshDocumentStatus } from "@/lib/documents";
import { db } from "@/lib/db";
import { respond, UserError } from "@/lib/errors";
import { cancelJob } from "@/lib/jobs";

export async function POST(_req: Request, ctx: RouteContext<"/api/jobs/[id]/cancel">) {
  return respond(async () => {
    const { id } = await ctx.params;
    await cancelJob(id).catch((err: Error) => {
      throw new UserError(err.message);
    });
    const job = await db.job.findUnique({ where: { id } });
    if (job?.documentId) await refreshDocumentStatus(job.documentId);
  });
}
