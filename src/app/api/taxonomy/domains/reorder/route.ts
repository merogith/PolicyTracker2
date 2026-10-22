import { respond, UserError } from "@/lib/errors";
import { reorderDomains } from "@/lib/taxonomy-edit";

export async function POST(req: Request) {
  return respond(async () => {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids)) throw new UserError("ids must be a list");
    await reorderDomains(ids);
  });
}
