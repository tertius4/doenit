// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import { registerHooks } from "node:module";
import { createSinkroDB, MemoryBackend } from "@tertius4/sinkro-db";
import { dexieStorage } from "@tertius4/sinkro-db/dexie";
import { canUseScope } from "../src/lib/domain/sinkro/access.ts";
import { tables } from "../src/lib/domain/sinkro/tables.ts";

// The app's imports leave out the extension, which Vite allows and Node does not.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.\w+$/.test(specifier)) return next(`${specifier}.ts`, context);
    if (specifier.startsWith("$domain/")) {
      return next(new URL(`../src/lib/domain/${specifier.slice(8)}.ts`, import.meta.url).href, context);
    }
    return next(specifier, context);
  },
});

const { default: SyncTable } = await import("../src/lib/domain/tables/sync-table.ts");
const { default: LocalTable } = await import("../src/lib/domain/tables/local-table.ts");
const { combineLive } = await import("../src/lib/display/view/live.ts");
const { visibleWhere } = await import("../src/lib/logic/visibility.ts");

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

test("an update with a whole document keeps to the table's fields", async () => {
  const db = await openDB("uid1");
  const task = new SyncTable(db.task);
  const created = await task.create({ name: "a", archived: false, soft_deleted: false, owner_id: "x" });
  assert.equal(created.ok, true);

  const updated = await task.update(created.value.id, { ...created.value, name: "b" });
  assert.equal(updated.ok, true);
  assert.equal(updated.value.name, "b");
  assert.equal(updated.value.created_at, created.value.created_at);
});

test("a task given a group moves to the group's channel", async () => {
  const db = await openDB("uid1");
  const task = new SyncTable(db.task);
  const created = await task.create({ name: "a", archived: false });

  const updated = await task.update(created.value.id, { scope_id: "g1" });
  assert.equal(updated.value.channel, "g1");
  assert.equal((await task.findMany({ where: { channel: "personal_uid1" } })).value.length, 0);
});

test("removing someone and adding them again gives a new row", async () => {
  const db = await openDB("uid1");
  const member = new SyncTable(db.member);
  const first = await member.create({ scope_id: "g1", firebase_uid: "uid2", role: "member" });
  await member.remove(first.value.id);

  assert.equal((await member.findOne({ where: { scope_id: "g1", firebase_uid: "uid2" } })).value, null);
  const second = await member.create({ scope_id: "g1", firebase_uid: "uid2", role: "member" });
  assert.equal(second.ok, true);
  assert.notEqual(second.value.id, first.value.id);
});

test("a copy from Firestore keeps its times, and an older one changes nothing", async () => {
  const db = await openDB("uid1");
  const invite = new LocalTable(db.contact_invite);
  const base = {
    id: "i1",
    relationship_id: "a:b",
    from_firebase_uid: "a",
    to_firebase_uid: "b",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  await invite.upsert({ ...base, status: "accepted", updated_at: "2026-01-02T00:00:00.000Z" });
  await invite.upsert({ ...base, status: "pending", updated_at: "2026-01-01T00:00:00.000Z" });

  const stored = await invite.findById("i1");
  assert.equal(stored.value.status, "accepted");
  assert.equal(stored.value.updated_at, "2026-01-02T00:00:00.000Z");
});

test("a change waits while its channel is not listed, then reaches another device", async () => {
  const backend = new MemoryBackend();
  const open = (channels) =>
    createSinkroDB({
      name: `test-sync-${(db_count += 1)}`,
      tables,
      storage: dexieStorage(),
      backend,
      channels,
      autoSync: false,
      context: () => ({ userId: "uid1" }),
    });

  const phone = await open([]);
  const task = await phone.task.insert({ name: "a", archived: false });
  await phone.sync.flush();
  assert.equal(backend.dump("personal_uid1").length, 0);

  await phone.sync.setChannels(["personal_uid1"]);
  await phone.sync.flush();

  const tablet = await open(["personal_uid1"]);
  await tablet.sync.flush();
  assert.equal((await tablet.task.get(task.id)).name, "a");
});

test("combineLive waits for every source and skips equal results", async () => {
  /** @type {Record<string, (value: number) => void>} */
  const send = {};
  const source = (name) => ({
    subscribe(next) {
      send[name] = next;
      return () => {};
    },
  });

  const seen = [];
  combineLive([source("a"), source("b")], (a, b) => a + b).subscribe((value) => seen.push(value));

  send.a(1);
  assert.deepEqual(seen, []);
  send.b(2);
  send.b(2);
  send.a(2);
  assert.deepEqual(seen, [3, 4]);
});

test("another account's personal tasks and old groups stay out of sight", async () => {
  let userId = "uid1";
  const db = await createSinkroDB({
    name: `test-${(db_count += 1)}`,
    tables,
    storage: dexieStorage(),
    context: () => ({ userId }),
  });
  await db.task.insert({ name: "personal", archived: false });
  await db.task.insert({ name: "group", archived: false, scope_id: "g1" });

  userId = "uid2";
  await db.task.insert({ name: "mine", archived: false });

  const names = async (where) => (await db.task.find({ where })).map((task) => task.name);
  assert.deepEqual(await names(visibleWhere("uid2", ["g2", "personal_uid2"])), ["mine"]);
  assert.deepEqual(await names(visibleWhere(null, [])), []);
});

test("forgetting a channel keeps data of a channel that was never listed", async () => {
  const db = await createSinkroDB({
    name: `test-${(db_count += 1)}`,
    tables,
    storage: dexieStorage(),
    backend: new MemoryBackend(),
    channels: ["g1"],
    autoSync: false,
    context: () => ({ userId: "uid1" }),
  });
  await db.task.insert({ name: "never synced", archived: false });
  await db.task.insert({ name: "group", archived: false, scope_id: "g1" });

  await db.sync.forgetChannel("g1");
  const tasks = await db.task.find({});
  assert.deepEqual(
    tasks.map((task) => task.name),
    ["never synced"],
  );
});
