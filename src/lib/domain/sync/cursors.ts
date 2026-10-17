import DB from "$domain/db";

/**
 * Key of a pull cursor in `sync_cursors`. Cursors hold Firestore's own `synced_at` stamps. The prefix keeps them apart
 * from the old device-clock cursors (stored under the bare key), which could already have skipped documents: a missing
 * prefixed cursor means "never pulled this way", so the first pull re-reads everything and repairs those gaps.
 */
export function cursorKey(key: string): string {
  return `s:${key}`;
}

/**
 * Atomically merges cursors into the user's `sync_cursors` and drops the keys in `remove`. Concurrent pulls (invites,
 * notifications, scopes) each update only their own keys instead of overwriting each other with a stale copy.
 */
export async function patchSyncCursors(
  user_id: string,
  cursors: Record<string, string>,
  remove: string[] = [],
): Promise<void> {
  const doc = await DB.user_state.collection.findOne(user_id).exec();
  if (!doc) return;

  await doc.incrementalModify((data) => {
    const sync_cursors = { ...(data.sync_cursors ?? {}), ...cursors };
    for (const key of remove) delete sync_cursors[key];
    return { ...data, sync_cursors, updated_at: new Date().toISOString() };
  });
}

/** Removes cursors from the user's `sync_cursors`, so the next pull of those keys starts from scratch. */
export async function removeSyncCursor(user_id: string, ...keys: string[]): Promise<void> {
  await patchSyncCursors(user_id, {}, keys);
}
