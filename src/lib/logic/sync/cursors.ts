import DB from "$domain/db";

/**
 * Key of a pull cursor in `sync_cursors`. Cursors hold Firestore's own `synced_at` stamps. The prefix keeps them apart
 * from the old device-clock cursors (stored under the bare key), which could already have skipped documents: a missing
 * prefixed cursor means "never pulled this way", so the first pull re-reads everything and repairs those gaps.
 */
export function cursorKey(key: string): string {
  return `s:${key}`;
}

let writes: Promise<void> = Promise.resolve();

/**
 * Merges cursors into the user's `sync_cursors` and drops the keys in `remove`. Writes run one after another, so
 * concurrent pulls (invites, notifications) never overwrite each other with a stale copy.
 */
export function patchSyncCursors(user_id: string, cursors: Record<string, string>, remove: string[] = []): Promise<void> {
  writes = writes.then(async () => {
    const state = await DB.user_state.findById(user_id);
    if (!state.ok || !state.value) return;

    const sync_cursors = { ...(state.value.sync_cursors ?? {}), ...cursors };
    for (const key of remove) delete sync_cursors[key];
    await DB.user_state.update(user_id, { sync_cursors });
  });
  return writes;
}
