// Read-only API connectivity check: no document uploads and no model generation.
import "dotenv/config";
import OpenAI from "openai";
import { configureSystemTrust, describeJobError } from "../src/lib/network";

async function main() {
  configureSystemTrust();
  const client = new OpenAI({ maxRetries: 0, timeout: 15000 });
  await client.models.list();
  console.log("API connection and authentication succeeded. Certificate verification is enabled. No model call was made.");
}
main().catch(error => { console.error(describeJobError(error)); process.exitCode = 1; });
