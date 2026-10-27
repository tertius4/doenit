import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getDb } from "../shared/firebase";
import { type StoredTask } from "./task-fields";

/** Every write is stamped as coming from the API, so the app's merge treats it like any other device. */
export const API_DEVICE_ID = "api";

/** What a key's owner can reach: their personal scope and the groups they belong to. */
export type Access = { uid: string; personal_scope: string; group_scopes: string[] };

/** The scope a task lives in: its group, or the owner's personal scope. */
export function scopeOf(access: Access, group_id: string | null): string {
  return group_id ?? access.personal_scope;
}

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

/** Category id → name for the scope's live categories. */
export async function categoryNames(scope_id: string): Promise<Map<string, string>> {
  const snap = await itemsOf(scope_id).where("collection", "==", "category").get();
  const names = new Map<string, string>();
  for (const doc of snap.docs) {
    if (!doc.get("soft_deleted")) names.set(doc.id, doc.get("name"));
  }
  return names;
}

/** Finds a category in the scope by name (ignoring case) or creates it, like the app does for API tasks. */
export async function resolveCategory(access: Access, scope_id: string, name: string): Promise<string> {
  const wanted = name.trim().toLowerCase();
  for (const [id, existing] of await categoryNames(scope_id)) {
    if (existing?.trim().toLowerCase() === wanted) return id;
  }

  const now = new Date().toISOString();
  const category = {
    id: randomUUID(),
    collection: "category",
    name: name.trim(),
    created_at: now,
    updated_at: now,
    soft_deleted: false,
    version: 0,
    owner_id: access.uid,
    device_id: API_DEVICE_ID,
    scope_id: scope_id === access.personal_scope ? null : scope_id,
  };
  await writeItem(scope_id, category);
  return category.id;
}

/** Finds a live task in any scope the owner can reach, with one batched read. */
export async function findTask(access: Access, id: string): Promise<{ task: StoredTask; scope_id: string } | null> {
  const scopes = [access.personal_scope, ...access.group_scopes];
  const snaps = await getDb().getAll(...scopes.map((scope_id) => itemsOf(scope_id).doc(id)));

  for (const [index, snap] of snaps.entries()) {
    const data = snap.data();
    if (!data || data.collection !== "task" || data.soft_deleted) continue;

    const { synced_at: _synced_at, ...task } = data;
    return { task: task as StoredTask, scope_id: scopes[index] };
  }
  return null;
}
