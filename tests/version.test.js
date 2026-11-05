// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";
import { isOlderVersion } from "../src/lib/logic/version.ts";

test("a lower version is older, part by part", () => {
  assert.equal(isOlderVersion("2.0.7", "2.1.0"), true);
  assert.equal(isOlderVersion("1.9.9", "2.0.0"), true);
  assert.equal(isOlderVersion("2.0.9", "2.0.10"), true);
});

test("the same or a higher version is not older", () => {
  assert.equal(isOlderVersion("2.1.0", "2.1.0"), false);
  assert.equal(isOlderVersion("2.1.1", "2.1.0"), false);
  assert.equal(isOlderVersion("2.0.10", "2.0.9"), false);
  assert.equal(isOlderVersion("3.0.0", "2.9.9"), false);
});

test("missing parts count as 0", () => {
  assert.equal(isOlderVersion("2.1", "2.1.0"), false);
  assert.equal(isOlderVersion("2.1", "2.1.1"), true);
});

test("an unreadable version is not older", () => {
  assert.equal(isOlderVersion("unknown", "2.1.0"), false);
});
