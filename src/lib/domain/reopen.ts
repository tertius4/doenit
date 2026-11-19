import type { Dexie } from "dexie";

/** Every Dexie connection RxDB opened for us, so they can be reopened after the WebView closed them. */
const connections = new Set<Dexie>();

/**
 * RxDB opens its Dexie connections with `autoOpen: false`. When the WebView closes a connection by itself (iOS does
 * this after the app was in the background a while), Dexie then refuses every later call with "Database has been
 * closed" until the app restarts. With `autoOpen` on, Dexie reopens on the next call instead.
 *
 * A deliberate `close()` (RxDB closing or removing the database) still turns auto open off, and the connection is
 * forgotten, so a closed RxDB stays closed.
 *
 * Pass as `onCreate` to `getRxStorageDexie`.
 */
export function keepReopenable(dexie_db: Dexie) {
  dexie_db._options.autoOpen = true;
  connections.add(dexie_db);

  const close = dexie_db.close.bind(dexie_db);
  dexie_db.close = (options?: { disableAutoOpen: boolean }) => {
    const is_deliberate = options?.disableAutoOpen !== false;
    if (is_deliberate) connections.delete(dexie_db);
    return close(options);
  };
}

/** Reopens every connection that was closed from outside. Call when the app comes back to the foreground. */
export async function reopenClosed() {
  const closed = [...connections].filter((dexie_db) => !dexie_db.isOpen());
  await Promise.all(
    closed.map((dexie_db) =>
      dexie_db.open().catch((error) => console.warn(`[DB] Reopening ${dexie_db.name} failed:`, error)),
    ),
  );
}
