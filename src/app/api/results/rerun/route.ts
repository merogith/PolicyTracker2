import { respond } from "@/lib/errors";
import { rerun } from "@/lib/reruns";

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json()) as { documentId?: string; countryId?: string; domainId?: string };
    return rerun(body);
  });
}
