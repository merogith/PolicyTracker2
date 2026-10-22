import { NextResponse } from "next/server";

/** An error caused by the request, shown to the user as is. */
export class UserError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Run a route handler body and turn errors into JSON responses. */
export async function respond(fn: () => Promise<unknown>) {
  try {
    const body = await fn();
    return NextResponse.json(body ?? { ok: true });
  } catch (err) {
    if (err instanceof UserError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
