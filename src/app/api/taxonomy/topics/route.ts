import { respond } from "@/lib/errors";
import { createTopic, type TopicInput } from "@/lib/taxonomy-edit";

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json()) as TopicInput & { preview?: boolean };
    return createTopic(body, Boolean(body.preview));
  });
}
