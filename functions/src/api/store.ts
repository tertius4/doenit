import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../shared/firebase";
import { type StoredTask } from "./task-fields";

/** Every write is stamped as coming from the API, so the app's merge treats it like any other device. */
export const API_DEVICE_ID = "api";

/** What a key's owner can reach: their personal scope and the shared lists they belong to. */
export type Access = { uid: string; personal_scope: string; shared_scopes: string[] };

export function itemsOf(scope_id: string): FirebaseFirestore.CollectionReference {
  return getDb().collection("scopes").doc(scope_id).collection("items");
}

/** Writes a full document the way the app pushes one: `synced_at` is what makes other devices pull it. */
export async function writeItem(scope_id: string, item: { id: string } & Record<string, unknown>): Promise<void> {
  await itemsOf(scope_id).doc(item.id).set({ ...item, synced_at: FieldValue.serverTimestamp() });
}

/** Not merged per field; mirrors META_FIELDS in the app (src/lib/domain/sync/field-times.ts). */
const META_FIELDS = new Set(["id", "created_at", "updated_at", "version", "device_id", "owner_id", "field_times"]);

/**
 * Stamps a change the way the app does: every field that differs from `before` gets `now` in field_times, so the
 * app merges it per field with changes made on a device at the same time. Also bumps the version.
 */
export function stampChange<T extends Record<string, any>>(before: T, after: T): T {
  const now = new Date().toISOString();
  const field_times: Record<string, string> = { ...(before.field_times ?? {}) };
  for (const key of Object.keys(after)) {
    if (META_FIELDS.has(key)) continue;
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) field_times[key] = now;
  }
  return { ...after, field_times, version: (before.version ?? 0) + 1, updated_at: now, device_id: API_DEVICE_ID };
}

/**
 * The scope a task in `list_id` lives in. A shared list is its own scope; a private list lives in the owner's
 * personal scope. `null` (the Inbox) is the personal scope too. Returns null for a list the owner can't reach.
 */
export async function scopeOfList(access: Access, list_id: string | null): Promise<string | null> {
  if (!list_id) return access.personal_scope;
  if (access.shared_scopes.includes(list_id)) return list_id;

  const snap = await itemsOf(access.personal_scope).doc(list_id).get();
  if (snap.exists && snap.get("collection") === "list" && !snap.get("soft_deleted")) return access.personal_scope;
  return null;
}

/** Finds a live task in any scope the owner can reach, with one batched read. */
export async function findTask(access: Access, id: string): Promise<{ task: StoredTask; scope_id: string } | null> {
  const scopes = [access.personal_scope, ...access.shared_scopes];
  const snaps = await getDb().getAll(...scopes.map((scope_id) => itemsOf(scope_id).doc(id)));

  for (const [index, snap] of snaps.entries()) {
    const data = snap.data();
    if (!data || data.collection !== "task" || data.soft_deleted) continue;

    const { synced_at: _synced_at, ...task } = data;
    return { task: task as StoredTask, scope_id: scopes[index] };
  }
  return null;
}

/** The live tasks of one list (null: the Inbox) in a scope, for the chain rules (chain.ts). */
export async function tasksOfList(scope_id: string, list_id: string | null): Promise<StoredTask[]> {
  const snap = await itemsOf(scope_id).where("collection", "==", "task").where("list_id", "==", list_id).get();
  return snap.docs
    .map((doc) => {
      const { synced_at: _synced_at, ...task } = doc.data();
      return task as StoredTask;
    })
    .filter((task) => !task.soft_deleted);
}

/** Writes changes to other tasks in the same scope (a chain's links or restart), stamped like any API change. */
export async function writeTaskChanges(
  scope_id: string,
  tasks: StoredTask[],
  changes: ({ id: string } & Partial<StoredTask>)[],
): Promise<void> {
  const by_id = new Map(tasks.map((task) => [task.id, task]));
  await Promise.all(
    changes.map(({ id, ...change }) => {
      const before = by_id.get(id);
      return before ? writeItem(scope_id, stampChange(before, { ...before, ...change })) : null;
    }),
  );
}
