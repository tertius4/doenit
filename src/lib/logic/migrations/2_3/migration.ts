import DB from "$domain/db";
import { SyncQueue } from "$domain/sync/SyncQueue";
import { stableId } from "$domain/sync/scopes";
import { context } from "$logic/context.svelte";
import { moveTask } from "$logic/api/lists";
import { planLists, planTasks, type LegacyCategory, type LegacyGroup, type ListPlan } from "./plan";

/**
 * Groups and categories became lists (app version 3). Runs once per device, before the first sync. Every list keeps
 * the id of the group or category it came from and moved tasks get ids derived from their old ones, so all members
 * of a group reach the same result and the first device to sync wins without duplicates.
 *
 * The old collections are no longer registered with RxDB, so their documents are read straight from IndexedDB and
 * those databases are deleted afterwards. Delete this folder once no device older than the migration remains.
 */

const DB_NAME = "doenit-db";
const LEGACY_COLLECTIONS = ["group", "category"] as const;

export async function runListMigration(): Promise<void> {
  const [groups, categories] = (await Promise.all(LEGACY_COLLECTIONS.map(readLegacyDocs))) as [
    LegacyGroup[],
    LegacyCategory[],
  ];

  const lists = planLists(groups, categories);
  for (const list of lists) await createList(list);

  const tasks_result = await DB.task.findMany({ selector: { soft_deleted: { $ne: true } } });
  if (!tasks_result.ok) throw new Error(tasks_result.error);

  const tasks = new Map(tasks_result.value.map((task) => [task.id, task]));
  const plans = planTasks(tasks_result.value, lists);
  const by_list = new Map(lists.map((list) => [list.id, list]));

  const stayed: string[] = [];
  for (const plan of plans) {
    const task = tasks.get(plan.id)!;
    if (plan.move_to === undefined) {
      if ((task.list_id ?? null) !== plan.list_id) {
        const result = await DB.task.updateRaw(task.id, { list_id: plan.list_id });
        if (!result.ok) throw new Error(result.error);
      }
      stayed.push(task.id);
      continue;
    }

    const list = by_list.get(plan.list_id!)!;
    const moved = await moveTask(task, list.id, list.scope_id);
    if (!moved.ok) throw new Error(moved.error);
  }

  // The schema migration wrote list_id without a field time; stamp it so it wins over copies pushed before it.
  const marked = await DB.task.markChanged(stayed, ["list_id"]);
  if (!marked.ok) throw new Error(marked.error);

  await dropLegacyQueueItems();
  await Promise.all(LEGACY_COLLECTIONS.map(deleteLegacyDatabases));
}

/** Creates the list (unless an earlier run or a synced copy already did), with the members of its group. */
async function createList(plan: ListPlan): Promise<void> {
  const { members_from, ...list } = plan;

  if (members_from && list.scope_id) await copyMembers(members_from, list.scope_id);

  const existing = await DB.list.findById(list.id);
  if (!existing.ok) throw new Error(existing.error);
  if (existing.value) return;

  const result = await DB.list.create({
    ...list,
    ...(list.owner_id ? {} : { owner_id: context.user?.id || "device" }),
  } as Domain.List);
  if (!result.ok) throw new Error(result.error);
}

/** Gives a new scope the members of a group scope, both as member documents and in each member's memberships. */
async function copyMembers(from_scope: string, to_scope: string): Promise<void> {
  const members = await DB.member.findMany({ selector: { scope_id: from_scope, soft_deleted: { $ne: true } } });
  if (!members.ok) throw new Error(members.error);

  // This device's own membership first: writing anything to the new scope needs it.
  const my_uid = context.user?.firebase_uid;
  const ordered = [...members.value].sort(
    (a, b) => Number(b.firebase_uid === my_uid) - Number(a.firebase_uid === my_uid),
  );

  for (const member of ordered) {
    await SyncQueue.enqueue({ table_name: "membership", entity_id: member.firebase_uid, scope_id: to_scope, op: "upsert" });

    const id = await stableId(to_scope, member.firebase_uid);
    const existing = await DB.member.findById(id);
    if (!existing.ok) throw new Error(existing.error);
    if (existing.value) continue;

    const result = await DB.member.create({
      id,
      scope_id: to_scope,
      firebase_uid: member.firebase_uid,
      role: member.role,
      owner_id: member.owner_id,
    } as Domain.Member & { id: string });
    if (!result.ok) throw new Error(result.error);
  }
}

/** Queued pushes of group and category documents can never be sent any more. */
async function dropLegacyQueueItems(): Promise<void> {
  const items = await DB.sync_queue.findMany({ selector: { table_name: { $in: [...LEGACY_COLLECTIONS] } } });
  if (!items.ok) throw new Error(items.error);
  await Promise.all(items.value.map((item) => SyncQueue.remove(item.id)));
}

/** RxDB's Dexie storage keeps a collection in IndexedDB databases named rxdb-dexie-<db>--<schema version>--<name>. */
async function legacyDatabaseNames(collection: string): Promise<string[]> {
  const pattern = new RegExp(`^rxdb-dexie-${DB_NAME}--\\d+--${collection}$`);
  const list = (indexedDB as any).databases;
  if (typeof list === "function") {
    const dbs: { name?: string }[] = await list.call(indexedDB);
    return dbs.map((db) => db.name ?? "").filter((name) => pattern.test(name));
  }

  // Without indexedDB.databases() (older WebViews), try the schema versions the collections ever had.
  return [0, 1].map((version) => `rxdb-dexie-${DB_NAME}--${version}--${collection}`);
}

async function readLegacyDocs(collection: string): Promise<any[]> {
  const docs = new Map<string, any>();
  for (const name of await legacyDatabaseNames(collection)) {
    for (const doc of await readDocs(name)) {
      if (doc?.id && doc._deleted !== true && doc._deleted !== "1" && !docs.has(doc.id)) docs.set(doc.id, doc);
    }
  }
  return [...docs.values()];
}

/** All documents in a database's "docs" store, without creating the database when it does not exist. */
function readDocs(name: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => open.transaction?.abort();
    open.onerror = () => (open.error?.name === "AbortError" ? resolve([]) : reject(open.error));
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("docs")) {
        db.close();
        return resolve([]);
      }

      const request = db.transaction("docs", "readonly").objectStore("docs").getAll();
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        db.close();
        resolve(request.result ?? []);
      };
    };
  });
}

async function deleteLegacyDatabases(collection: string): Promise<void> {
  for (const name of await legacyDatabaseNames(collection)) {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }
}
