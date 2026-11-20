// @ts-nocheck
// Run: node --test tests/migration-2-3.test.js
// The pure rules of the groups/categories -> lists migration (src/lib/logic/migrations/2_3/plan.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { planLists, planTasks } from "../src/lib/logic/migrations/2_3/plan.ts";
import { stableId } from "../src/lib/domain/sync/scopes.ts";

const group = { id: "g1", name: "Familie", description: "Ons huis", scope_id: "g1", owner_id: "u1" };
const lonely_group = { id: "g2", name: "Net ek", scope_id: null, owner_id: "u1" };
const personal_category = { id: "c1", name: "Werk", scope_id: null, owner_id: "u1" };
const group_category = { id: "c2", name: "Tuin", scope_id: "g1", owner_id: "u1" };
const orphan_category = { id: "c3", name: "Weg", scope_id: "g9", owner_id: "u1" };

test("a personal category becomes a private list with the same id", () => {
  const [list] = planLists([], [personal_category]);
  assert.deepEqual(list, {
    id: "c1",
    name: "Werk",
    description: "",
    scope_id: null,
    owner_id: "u1",
    created_at: undefined,
  });
});

test("a group becomes a list with the same id, scope and description", () => {
  const [list] = planLists([group], []);
  assert.equal(list.id, "g1");
  assert.equal(list.scope_id, "g1");
  assert.equal(list.description, "Ons huis");
  assert.equal(list.members_from, undefined);
});

test("a group nobody was added to becomes a private list", () => {
  const [list] = planLists([lonely_group], []);
  assert.equal(list.scope_id, null);
});

test("a category in a group becomes a shared list in its own scope, with the group's members", () => {
  const lists = planLists([group], [group_category]);
  const list = lists.find((l) => l.id === "c2");
  assert.equal(list.scope_id, "c2");
  assert.equal(list.members_from, "g1");
});

test("the default category, deleted ones and categories of a gone group are dropped", () => {
  const lists = planLists(
    [group, { ...lonely_group, soft_deleted: true }],
    [{ id: "default", name: "Standaard" }, { ...personal_category, soft_deleted: true }, orphan_category],
  );
  assert.deepEqual(
    lists.map((l) => l.id),
    ["g1"],
  );
});

test("an empty category still becomes a list, and a blank name gets a placeholder", () => {
  const lists = planLists([], [{ id: "c4", name: "  ", scope_id: null }]);
  assert.equal(lists.length, 1);
  assert.equal(lists[0].name, "?");
});

test("tasks stay in their own scope, except group tasks in one of the group's categories", () => {
  const lists = planLists([group], [personal_category, group_category]);
  const plans = planTasks(
    [
      { id: "t1", list_id: "c1", scope_id: null }, // personal task in a personal category
      { id: "t2", list_id: null, scope_id: null }, // personal task without a category
      { id: "t3", list_id: "g1", scope_id: "g1" }, // group task without a category
      { id: "t4", list_id: "c2", scope_id: "g1" }, // group task in the group's category
      { id: "t5", list_id: "c1", scope_id: "g1" }, // group task with a personal category
      { id: "t6", list_id: "c2", scope_id: null }, // personal task with the group's category
      { id: "t7", list_id: "c3", scope_id: null }, // a category that was dropped
    ],
    lists,
  );

  assert.deepEqual(plans, [
    { id: "t1", list_id: "c1" },
    { id: "t2", list_id: null },
    { id: "t3", list_id: "g1" },
    { id: "t4", list_id: "c2", move_to: "c2" },
    { id: "t5", list_id: "g1" },
    { id: "t6", list_id: null },
    { id: "t7", list_id: null },
  ]);
});

test("running the plan again on its own result changes nothing", () => {
  const lists = planLists([group], [personal_category, group_category]);
  const first = planTasks([{ id: "t4", list_id: "c2", scope_id: "g1" }], lists);
  // After the move the task is in scope c2 with list c2.
  const second = planTasks([{ id: "t4", list_id: first[0].list_id, scope_id: first[0].move_to }], lists);
  assert.deepEqual(second, [{ id: "t4", list_id: "c2" }]);
});

test("stableId is a UUID and the same on every device", async () => {
  const a = await stableId("task-1", "c2");
  const b = await stableId("task-1", "c2");
  const c = await stableId("task-1", "personal");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});
