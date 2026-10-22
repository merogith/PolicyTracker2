import assert from "node:assert/strict";
import { test } from "node:test";
import { describeJobError } from "./network";

test("TLS and network errors give safe actionable context without dumping nested payloads",()=>{
  const tls={message:"Connection error.",cause:{code:"UNABLE_TO_VERIFY_LEAF_SIGNATURE",message:"secret request data"}};
  assert.match(describeJobError(tls),/certificate/);
  assert.doesNotMatch(describeJobError(tls),/secret request data/);
  assert.match(describeJobError({cause:{code:"ENOTFOUND"}}),/Cannot reach/);
  assert.equal(describeJobError(new Error("Ordinary failure")),"Ordinary failure");
});
