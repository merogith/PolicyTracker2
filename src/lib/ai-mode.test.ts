import assert from "node:assert/strict";
import { test } from "node:test";
import { aiMode, isDemoId, isDemoSource } from "./ai-mode";

test("missing credentials never silently select demo mode", () => {
  assert.equal(aiMode({}), "missing_key");
  assert.equal(aiMode({ OPENAI_FAKE: "0", OPENAI_API_KEY: " " }), "missing_key");
  assert.equal(aiMode({ OPENAI_API_KEY: "test" }), "live");
  assert.equal(aiMode({ OPENAI_FAKE: "1", OPENAI_API_KEY: "test" }), "demo");
});

test("saved demo provenance remains identifiable after a mode change", () => {
  assert.equal(isDemoId("vs_fake_123"), true);
  assert.equal(isDemoId("file_fake_123"), true);
  assert.equal(isDemoId("vs_live"), false);
  assert.equal(isDemoSource({ mode: "demo" }), true);
  assert.equal(isDemoSource({ queries: ["(fake) question and search hints"] }), true);
  assert.equal(isDemoSource({ responseId: "resp_fake_old" }), true);
  assert.equal(isDemoSource({ mode: "live", responseId: "resp_123" }), false);
  assert.equal(isDemoSource(null), false);
});
