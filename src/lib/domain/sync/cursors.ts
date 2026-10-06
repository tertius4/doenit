import DB from "$domain/db";

/**
 * Margin applied when querying with a cursor, so a device whose clock is behind the writer's cannot
 * permanently miss documents. Re-fetched documents are harmless because every apply step is idempotent.
 */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Moves a cursor back by the clock-skew margin. Returns undefined for no cursor. */
export function withClockSkew(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined;

  const time = Date.parse(cursor);
  if (Number.isNaN(time)) return cursor;

  return new Date(time - CLOCK_SKEW_MS).toISOString();
}

/**
 * Atomically merges cursors into the user's `sync_cursors`. Concurrent pulls (invites, notifications,
 * scopes) each update only their own keys instead of overwriting each other with a stale copy.
 */
export async function patchSyncCursors(user_id: string, cursors: Record<string, string>): Promise<void> {
  const doc = await DB.user_state.collection.findOne(user_id).exec();
  if (!doc) return;

  await doc.incrementalModify((data) => ({
    ...data,
    sync_cursors: { ...(data.sync_cursors ?? {}), ...cursors },
    updated_at: new Date().toISOString(),
  }));
}

/** Removes a cursor from the user's `sync_cursors`, so the next pull of that key starts from scratch. */
export async function removeSyncCursor(user_id: string, key: string): Promise<void> {
  const doc = await DB.user_state.collection.findOne(user_id).exec();
  if (!doc) return;

  await doc.incrementalModify((data) => {
    const { [key]: _, ...sync_cursors } = data.sync_cursors ?? {};
    return { ...data, sync_cursors, updated_at: new Date().toISOString() };
  });
}
