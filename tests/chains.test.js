// @ts-nocheck
// Fase 5: tasks that wait on each other (src/lib/logic/chains.ts). The restart and detach rules also run against the
// API's copy (functions/src/api/chain.ts), so the two stay the same.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as app from "../src/lib/logic/chains.ts";
import * as api from "../functions/src/api/chain.ts";

const { insertAfter, wouldCycle, normalize, isWaiting, orderChains, chainOf } = app;

/** Applies changes like the app does, so a test can check the chain that results. */
function apply(tasks, changes) {
  const by_id = new Map(changes.map((c) => [c.id, c.after_task_id]));
  return tasks.map((t) => (by_id.has(t.id) ? { ...t, after_task_id: by_id.get(t.id) } : t));
}

const t = (id, after_task_id = null, extra = {}) => ({ id, after_task_id, created_at: `2026-11-0${id.charCodeAt(0) - 96}`, ...extra });

test("insertAfter puts a task in between: C after A while B is after A gives A → C → B", () => {
  const tasks = [t("a"), t("b", "a"), t("c")];
  const result = apply(tasks, insertAfter(tasks, "c", "a"));
  assert.deepEqual(chainOf(result, "a"), ["a", "c", "b"]);
});

test("insertAfter moves a task out of its old place first", () => {
  const tasks = [t("a"), t("b", "a"), t("c", "b"), t("d")];
  // B goes after D: C now waits on A.
  const result = apply(tasks, insertAfter(tasks, "b", "d"));
  assert.deepEqual(chainOf(result, "a"), ["a", "c"]);
  assert.deepEqual(chainOf(result, "d"), ["d", "b"]);
  assert.deepEqual(insertAfter(tasks, "b", "a"), [], "no change when already there");
});

test("a circle is refused", () => {
  const tasks = [t("a"), t("b", "a"), t("c", "b")];
  assert.equal(wouldCycle(tasks, "a", "c"), true);
  assert.equal(wouldCycle(tasks, "a", "a"), true);
  assert.equal(wouldCycle(tasks, "c", "a"), false);
  assert.equal(wouldCycle(tasks, "a", null), false);
});

for (const [name, rules] of [
  ["app", app],
  ["api", api],
]) {
  test(`${name}: deleting or moving a task relinks the chain`, () => {
    const tasks = [t("a"), t("b", "a"), t("c", "b")];
    const result = apply(tasks, rules.detach(tasks, "b"));
    assert.equal(result.find((x) => x.id === "c").after_task_id, "a");
    assert.equal(result.find((x) => x.id === "b").after_task_id, null);

    const first = apply(tasks, rules.detach(tasks, "a"));
    assert.equal(first.find((x) => x.id === "b").after_task_id, null, "the next task starts when the first leaves");
  });

  test(`${name}: the first task repeats: once the chain is done it starts over, dates move along`, () => {
    const next = (head) => ({ start_date: "2026-11-09 08:00", due_date: null });
    const tasks = [
      t("a", null, { archived: true, repeat_interval: "weekly", start_date: "2026-11-02 08:00" }),
      t("b", "a", { archived: true, start_date: "2026-11-03", due_date: "2026-11-04 17:00" }),
      t("c", "b", { archived: false, start_date: null }),
    ];
    assert.deepEqual(rules.restartChain(tasks, "b", next), [], "not while C is open");

    const done = tasks.map((x) => ({ ...x, archived: true }));
    assert.deepEqual(rules.restartChain(done, "c", next), [
      { id: "a", start_date: "2026-11-09 08:00", due_date: null },
      { id: "b", start_date: "2026-11-10", due_date: "2026-11-11 17:00" },
      { id: "c", start_date: null, due_date: null },
    ]);

    const no_repeat = done.map((x) => ({ ...x, repeat_interval: "" }));
    assert.deepEqual(rules.restartChain(no_repeat, "c", next), [], "a chain that doesn't repeat stays done");
  });

  test(`${name}: only the first task of a chain is its head`, () => {
    const tasks = [t("a"), t("b", "a"), t("c")];
    assert.equal(rules.isChainHead(tasks, "a"), true);
    assert.equal(rules.isChainHead(tasks, "b"), false);
    assert.equal(rules.isChainHead(tasks, "c"), false, "a task on its own is not a chain");
  });

  test(`${name}: dates`, () => {
    assert.equal(rules.daysBetween("2026-11-30", "2026-12-02 09:00"), 2);
    assert.equal(rules.shiftDate("2026-12-31 07:30", 1), "2027-01-01 07:30");
    assert.equal(rules.shiftDate(null, 3), null);
  });
}

test("two successors after a sync conflict become one line again", () => {
  const tasks = [t("a"), t("b", "a"), t("c", "a"), t("d", "c")];
  const result = apply(tasks, normalize(tasks));
  assert.deepEqual(chainOf(result, "a"), ["a", "b", "c", "d"]);
  assert.deepEqual(normalize(result), []);
});

test("a task waits while the one before it is open; reopening A leaves B done", () => {
  const b = t("b", "a");
  assert.equal(isWaiting(b, new Set(["a", "b"])), true);
  assert.equal(isWaiting(b, new Set(["b"])), false);
  assert.equal(isWaiting(t("a"), new Set(["a"])), false);
  // Reopening A changes nothing about B: B keeps its own archived flag.
  const tasks = [t("a", null, { archived: false }), t("b", "a", { archived: true })];
  assert.equal(tasks[1].archived, true);
});

test("orderChains puts each task straight after the one it waits on", () => {
  const tasks = [t("c", "b"), t("x"), t("a"), t("b", "a")];
  assert.deepEqual(
    orderChains(tasks).map((x) => x.id),
    ["x", "a", "b", "c"],
  );
});
