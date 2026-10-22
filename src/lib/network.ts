import tls from "node:tls";

type SystemTrust = {
  getCACertificates?: (type: "default" | "system") => string[];
  setDefaultCACertificates?: (certificates: string[]) => void;
};
let configured = false;

/** Use the OS trust store in addition to Node's roots; never disable certificate verification. */
export function configureSystemTrust() {
  if (configured) return;
  const api = tls as typeof tls & SystemTrust;
  if (api.getCACertificates && api.setDefaultCACertificates) {
    api.setDefaultCACertificates([...new Set([...api.getCACertificates("default"), ...api.getCACertificates("system")])]);
  }
  configured = true;
}

/** Keep credentials, headers and raw request payloads out of the jobs UI. */
export function describeJobError(error: unknown): string {
  const e = error as { message?: string; cause?: unknown; code?: string } | null;
  const codes: string[] = [];
  let cause = e;
  for (let i = 0; cause && i < 5; i++) {
    if (typeof cause.code === "string") codes.push(cause.code);
    cause = cause.cause as typeof e;
  }
  if (codes.some(code => /CERT|SELF_SIGNED|LEAF_SIGNATURE/.test(code))) return "Secure connection failed: Node could not verify the API certificate. Restart the worker with Node 22.19+ or 24.5+ so it uses the system certificate store.";
  if (codes.some(code => /ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR/.test(code))) return `Cannot reach the AI service (${codes[0]}). The worker will retry when eligible; check network or proxy connectivity.`;
  return e?.message ?? String(error);
}
