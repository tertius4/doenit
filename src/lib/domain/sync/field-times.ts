/**
 * Per-field conflict resolution. Every synced document keeps `field_times`: when each field last changed. When two
 * copies differ, the most recent change wins per field, so an edit on one device and a completion on another (made
 * while the first was offline) both survive instead of one whole copy overwriting the other.
 *
 * A field without a time is as old as the document's creation, or, for a document that predates field_times (or was
 * written by an older app version), as old as its last update.
 */

export type FieldTimes = Record<string, string>;
type SyncedDoc = Record<string, any> & DB.MetaDataShared & { field_times?: FieldTimes };

/** Describe the document itself rather than its content, so they are never merged per field. */
const META_FIELDS = new Set(["id", "created_at", "updated_at", "version", "device_id", "owner_id", "field_times"]);

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function fieldTime(doc: SyncedDoc, key: string): string {
  return doc.field_times?.[key] ?? (doc.field_times ? doc.created_at : doc.updated_at) ?? "";
}

/** `before`'s field times with every field whose value differs in `after` stamped `now`. */
export function stampChanges(before: Record<string, any>, after: Record<string, any>, now: string): FieldTimes {
  const times: FieldTimes = { ...(before.field_times ?? {}) };
  for (const key of Object.keys(after)) {
    if (!META_FIELDS.has(key) && !sameValue(before[key], after[key])) times[key] = now;
  }
  return times;
}

/**
 * Merges two copies of a document field by field. `local_won` means the result has changes the remote copy lacks (so
 * it has to be pushed again); `remote_won` means it has changes the local copy lacks.
 */
export function mergeFields(local: SyncedDoc, remote: SyncedDoc) {
  const merged: Record<string, any> = {};
  const field_times: FieldTimes = {};
  let local_won = false;
  let remote_won = false;

  const keys = new Set([...Object.keys(local), ...Object.keys(remote)].filter((key) => !META_FIELDS.has(key)));
  for (const key of keys) {
    const local_time = fieldTime(local, key);
    const remote_time = fieldTime(remote, key);
    const take_remote = remote_time > local_time || (remote_time === local_time && remote.device_id > local.device_id);

    merged[key] = take_remote ? remote[key] : local[key];
    field_times[key] = take_remote ? remote_time : local_time;
    if (sameValue(local[key], remote[key])) continue;
    if (take_remote) remote_won = true;
    else local_won = true;
  }

  return { merged, field_times, local_won, remote_won };
}
