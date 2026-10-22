import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCap, estimateSynthesis } from "./cost";

test("no synthesis cost for zero or one document", () => {
  assert.equal(estimateSynthesis(0), 0);
  assert.equal(estimateSynthesis(1), 0);
  assert.ok(estimateSynthesis(2) > 0);
});

test("no implicit cost cap, but an explicit cap is respected and malformed values fail", () => {
  const previous = process.env.MAX_USD_PER_RUN;
  try {
    for (const value of [undefined, "", "0"]) {
      if (value === undefined) delete process.env.MAX_USD_PER_RUN;
      else process.env.MAX_USD_PER_RUN = value;
      assert.equal(checkCap(10_000), null);
    }
    process.env.MAX_USD_PER_RUN = "25";
    assert.equal(checkCap(25), null);
    assert.match(checkCap(26)!, /exceeds the cap/);
    for (const value of ["bad", "-1", "Infinity"]) {
      process.env.MAX_USD_PER_RUN = value;
      assert.throws(() => checkCap(26), /non-negative/);
    }
  } finally {
    if (previous === undefined) delete process.env.MAX_USD_PER_RUN;
    else process.env.MAX_USD_PER_RUN = previous;
  }
});
