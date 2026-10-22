import { respond } from "@/lib/errors";
import { createDomain, type DomainInput } from "@/lib/taxonomy-edit";

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json()) as DomainInput & { preview?: boolean };
    return createDomain(body, Boolean(body.preview));
  });
}
