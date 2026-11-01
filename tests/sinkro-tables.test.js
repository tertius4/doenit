// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import { createSinkroDB } from "@tertius4/sinkro-db";
import { dexieStorage } from "@tertius4/sinkro-db/dexie";
import { canUseScope } from "../src/lib/domain/sinkro/access.ts";
import { tables } from "../src/lib/domain/sinkro/tables.ts";

let db_count = 0;

function openDB(userId) {
  db_count += 1;
  return createSinkroDB({
    name: `test-${db_count}`,
    tables,
    storage: dexieStorage(),
    context: () => ({ userId }),
  });
}

test("a task goes to the local, personal or group channel", async () => {
  const signed_out = await openDB(null);
  const signed_in = await openDB("uid1");

  assert.equal((await signed_out.task.insert({ name: "a", archived: false })).channel, "local");
  assert.equal((await signed_in.task.insert({ name: "b", archived: false })).channel, "personal_uid1");
  assert.equal((await signed_in.task.insert({ name: "c", archived: false, scope_id: "g1" })).channel, "g1");
});

test("an unassigned task is found by $in with null", async () => {
  const db = await openDB("uid1");
  await db.task.insert({ name: "unassigned", archived: false });
  await db.task.insert({ name: "mine", archived: false, assigned_firebase_uid: "uid1" });
  await db.task.insert({ name: "theirs", archived: false, assigned_firebase_uid: "uid2" });

  const found = await db.task.find({ where: { assigned_firebase_uid: { $in: [null, "uid1"] } }, sort: ["name"] });
  assert.deepEqual(
    found.map((task) => task.name),
    ["mine", "unassigned"],
  );
});

test("an old document without its optional fields can still be updated", async () => {
  const db = await openDB("uid1");
  const now = new Date().toISOString();
  await db.category.import([{ id: "c1", created_at: now, updated_at: now, channel: "personal_uid1" }]);

  assert.equal((await db.category.update("c1", { name: "Werk" })).name, "Werk");
});

test("an unread notification is found by null, also through its index", async () => {
  const db = await openDB("uid1");
  await db.notification.insert({ user_id: "u1", type: "mentioned", title: "t", body: "b", data: {} });

  assert.equal(await db.notification.count({ where: { user_id: "u1", read_at: null } }), 1);
});

test("a task moves to a group with its stamps", async () => {
  const db = await openDB("uid1");
  const task = await db.task.insert({ name: "a", archived: false });

  const moved = await db.task.moveChannel(task.id, "g1");
  assert.equal(moved.channel, "g1");
  assert.equal(moved.created_at, task.created_at);
});

test("scope access matches firestore.rules", async () => {
  const memberships = { uid1: ["g1", "personal_uid2"], uid2: [] };

  assert.equal(await canUseScope("uid1", "g1", memberships), true);
  assert.equal(await canUseScope("uid2", "g1", memberships), false);
  assert.equal(await canUseScope(null, "g1", memberships), false);
  assert.equal(await canUseScope("uid1", "personal_uid1", memberships), true);
  assert.equal(await canUseScope("uid1", "personal_uid2", memberships), false);
  assert.equal(await canUseScope(null, "personal_uid1", memberships), false);
});
