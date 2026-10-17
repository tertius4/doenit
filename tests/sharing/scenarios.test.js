// @ts-nocheck
// Run: node --test tests/sharing/
// Each scenario runs against the legacy algorithm (expected to lose the task: reproduces the bug) and the fixed one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, MIN } from "./sim.js";

/** Runs `scenario` in both modes: legacy must return `legacy_expected`, fixed must return true. */
function both(name, scenario, legacy_expected = false) {
  test(`${name} [legacy]`, () => assert.equal(scenario("legacy"), legacy_expected));
  test(`${name} [fixed]`, () => assert.equal(scenario("fixed"), true));
}

both(
  "1. baseline: online create and edit reach the other member",
  (mode) => {
    const { clock, A, B } = world(mode);
    A.pull();
    const task = B.create();
    B.push();
    clock.advance(MIN);
    A.pull();
    B.edit(task.id, { name: "Renamed" });
    B.push();
    clock.advance(MIN);
    A.pull();
    return A.local.get(task.id)?.name === "Renamed";
  },
  true,
);

both("2. task created offline is pushed 10 min later, after the other member pulled", (mode) => {
  const { clock, A, B } = world(mode);
  A.pull();
  B.online = false;
  const task = B.create();
  clock.advance(10 * MIN);
  A.pull();
  B.online = true;
  B.push();
  clock.advance(MIN);
  A.pull();
  return A.sees(task.id);
});

both("3. writer's clock is 7 min behind", (mode) => {
  const { clock, A, B } = world(mode, { b: { offset_ms: -7 * MIN } });
  A.pull();
  clock.advance(1000);
  const task = B.create();
  B.push();
  clock.advance(MIN);
  A.pull();
  return A.sees(task.id);
});

both("4. push fails, is retried after backoff, other member pulls in between", (mode) => {
  const { clock, A, B } = world(mode);
  let failures = 8;
  B.failPush = () => failures-- > 0;
  const task = B.create();
  for (let i = 0; i < 80; i++) {
    B.push();
    A.pull();
    clock.advance(30_000);
  }
  return A.sees(task.id);
});

both("5. realtime listener fires for a late write", (mode) => {
  const { clock, A, B } = world(mode);
  B.online = false;
  B.create();
  clock.advance(10 * MIN);
  let fired = false;
  A.listen(() => (fired = true));
  B.online = true;
  B.push();
  return fired;
});

both("6. remote task carries a field this schema doesn't know (other app version)", (mode) => {
  const { clock, A, B } = world(mode);
  B.extra_fields = { assigned_user_id: "someone" };
  const task = B.create();
  B.push();
  clock.advance(MIN);
  A.pull();
  return A.sees(task.id);
});

both("7. push keeps failing for 20+ attempts, then recovers", (mode) => {
  const { clock, A, B } = world(mode);
  let failures = 25;
  B.failPush = () => failures-- > 0;
  const task = B.create();
  for (let i = 0; i < 24 * 60 * 2; i++) {
    B.push();
    clock.advance(30_000);
  }
  A.pull();
  return A.sees(task.id);
});

test("8. recovery: a device with an already broken legacy cursor gets everything after upgrading", () => {
  const { clock, A, B } = world("legacy");
  A.pull();
  const kept = A.create({ name: "Mine" });
  A.push();
  B.online = false;
  const missed = B.create();
  clock.advance(10 * MIN);
  A.pull();
  B.online = true;
  B.push();
  clock.advance(MIN);
  A.pull();
  assert.equal(A.sees(missed.id), false, "legacy state must reproduce the miss");

  // A newer local edit on A that is not pushed yet must survive the full re-fetch.
  A.edit(kept.id, { name: "Mine, edited" });

  A.mode = B.mode = "fixed";
  A.pull();
  assert.equal(A.sees(missed.id), true);
  assert.equal(A.local.get(kept.id).name, "Mine, edited");
  assert.equal(A.cursors.g1, undefined, "legacy cursor key is removed");
  assert.ok(A.cursors["s:g1"], "new cursor is stored");

  // Legacy docs have no synced_at: the epoch cursor keeps later pulls incremental instead of full again.
  clock.advance(MIN);
  const later = B.create();
  B.push();
  A.pull();
  assert.equal(A.sees(later.id), true);
});

test("9a. concurrent edits converge on both devices", () => {
  const { clock, A, B } = world("fixed");
  const task = A.create();
  A.push();
  B.pull();
  A.edit(task.id, { name: "from A" });
  clock.advance(1000);
  B.edit(task.id, { name: "from B" });
  A.push();
  B.push();
  A.pull();
  B.pull();
  assert.equal(A.local.get(task.id).name, "from B");
  assert.equal(B.local.get(task.id).name, "from B");
});

test("9b. tombstone for a task the device never saw is skipped", () => {
  const { clock, A, B } = world("fixed");
  const task = B.create();
  B.edit(task.id, { soft_deleted: true });
  B.push();
  clock.advance(MIN);
  A.pull();
  assert.equal(A.local.has(task.id), false);
});

test("9c. member joining later gets every task in a full fetch", () => {
  const { clock, A, B } = world("fixed");
  const tasks = [A.create(), A.create(), A.create()];
  A.push();
  clock.advance(60 * MIN);
  B.pull();
  assert.ok(tasks.every((t) => B.sees(t.id)));
});

test("9d. leave and re-join re-fetches everything", () => {
  const { clock, A, B } = world("fixed");
  const before = A.create();
  A.push();
  B.pull();
  B.purge();
  const during = A.create();
  A.push();
  clock.advance(MIN);
  B.pull();
  assert.ok(B.sees(before.id) && B.sees(during.id));
});
