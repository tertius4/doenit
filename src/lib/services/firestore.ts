import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  where,
  limit,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "$lib/logic/chunk/firebase-firestore";
import { initializeApp, getApp } from "$lib/logic/chunk/firebase-app";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from "$lib/logic/chunk/firebase-auth";
import { Capacitor } from "@capacitor/core";
import * as env from "$env/static/public";
import { config } from "$lib/config";

export type RemoteDoc = DB.MetaDataShared & { scope_id: string; collection: string };

/** A page of documents plus the cursor to pass as `since` next time. */
export type Pulled<T> = { docs: T[]; cursor: string };

const EPOCH = new Date(0).toISOString();

/**
 * Pulls are keyed on `synced_at`, which Firestore stamps with its own clock on every write (firestore.rules enforces
 * it). Device clocks never decide what is fetched, so writes pushed late (offline, retried) are still picked up.
 * Without a cursor the whole collection is read, which also includes documents written before `synced_at` existed.
 */
function sinceQuery(ref: CollectionReference, since: string | undefined, ...full_fetch: QueryConstraint[]) {
  if (!since) return query(ref, ...full_fetch);
  return query(ref, where("synced_at", ">", Timestamp.fromDate(new Date(since))), orderBy("synced_at", "asc"));
}

/**
 * Strips `synced_at` (local schemas don't know it) and returns the highest one as the next cursor. Pending local
 * writes have no stamp yet and are skipped. Rounding down to ms can only re-fetch the newest doc, never skip one.
 */
function toPulled<T>(
  docs: QueryDocumentSnapshot[],
  since: string | undefined,
  map: (d: QueryDocumentSnapshot, data: any) => T,
): Pulled<T> {
  let cursor = since ?? EPOCH;
  const out = docs.map((d) => {
    const { synced_at, ...data } = d.data();
    if (synced_at instanceof Timestamp) {
      const iso = synced_at.toDate().toISOString();
      if (iso > cursor) cursor = iso;
    }
    return map(d, data);
  });
  return { docs: out, cursor };
}

class Firestore {
  private initialized = false;

  init() {
    if (this.initialized) return;

    this.initialized = true;
    const app = initializeApp(config.firebase_config, env.PUBLIC_APP_ID);

    // Auth is created here rather than left to getAuth(), which defaults to IndexedDB persistence.
    // Auth runs its initialisation on a serial queue and signInWithCredential is queued behind it,
    // so an IndexedDB probe that settles neither way blocks that queue for good and the sign-in
    // spinner never ends. localStorage has no such problem. This is the same WKWebView-under-a-
    // custom-scheme hazard as the long polling below, which is why only iOS is singled out;
    // Android keeps IndexedDB, and with it the sessions already stored there.
    try {
      initializeAuth(app, {
        persistence:
          Capacitor.getPlatform() === "ios"
            ? browserLocalPersistence
            : [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch (e) {
      // Throws auth/already-initialized if anything reached getAuth() first - a dev HMR reload,
      // normally. Logged rather than swallowed: in a real build it would mean Auth came up on the
      // default persistence after all, which is the whole thing this call exists to avoid.
      console.warn("[firestore] Auth was already initialised:", e);
    }

    // The database id matters: without it the settings land on the "(default)" database while
    // getDb() below uses the named one, so they would never apply. Long polling is forced on
    // native because Firestore's streaming transport often fails to establish in a WKWebView under
    // a custom scheme, and its promises then neither resolve nor reject - the SDK just retries
    // forever, which strands anything awaiting a read or write.
    const settings = Capacitor.isNativePlatform()
      ? { experimentalForceLongPolling: true }
      : { experimentalAutoDetectLongPolling: true };
    initializeFirestore(app, settings, env.PUBLIC_FIREBASE_DB_NAME);
  }

  /** Returns the Firestore instance. Requires firestore.init() to have been called. */
  getDb() {
    return getFirestore(getApp(env.PUBLIC_APP_ID), env.PUBLIC_FIREBASE_DB_NAME);
  }

  /** Returns the Auth instance. Requires firestore.init() to have been called. */
  getAuth() {
    return getAuth(getApp(env.PUBLIC_APP_ID));
  }

  /** Resolves the uid of the persisted Firebase user once Auth has restored its session, or null when signed out. */
  async getCurrentUid(): Promise<string | null> {
    const auth = this.getAuth();
    await auth.authStateReady();
    return auth.currentUser?.uid ?? null;
  }

  /** Fetches a scope's items written after the `since` cursor, or all of them without one. */
  async fetch(scope_id: string, since?: string): Promise<Pulled<RemoteDoc>> {
    const db = this.getDb();
    const ref = collection(db, "scopes", scope_id, "items");
    const snapshot = await getDocs(sinceQuery(ref, since));
    return toPulled(snapshot.docs, since, (_, data) => data as RemoteDoc);
  }

  /**
   * Writes a full document to Firestore under its scope.
   * Used for both creates and updates.
   */
  async upsert(col: string, document: DB.MetaDataShared & Record<string, any>): Promise<void> {
    if (!document.scope_id) throw new Error("[Firestore] Cannot upsert document without scope_id");

    const db = this.getDb();
    const ref = doc(db, "scopes", document.scope_id, "items", document.id);
    await setDoc(ref, { ...document, collection: col, synced_at: serverTimestamp() });
  }

  /**
   * Writes a tombstone for a deleted document so other devices can react.
   * Does NOT hard-delete — the record stays in Firestore as soft_deleted: true.
   */
  async delete(item: { scope_id: string; table_name: string; entity_id: string }): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "scopes", item.scope_id, "items", item.entity_id);
    await setDoc(ref, {
      id: item.entity_id,
      collection: item.table_name,
      scope_id: item.scope_id,
      soft_deleted: true,
      updated_at: new Date().toISOString(),
      synced_at: serverTimestamp(),
    });
  }

  async fetchMemberships(user_id: string): Promise<string[]> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "meta", "memberships");
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    return (snap.data().scopes as string[]) ?? [];
  }

  /**
   * True only when the scope's group document exists and is soft-deleted. A missing document is NOT
   * treated as deleted: the owner's push of the group may simply not have landed yet.
   */
  async scopeDeleted(scope_id: string): Promise<boolean> {
    const db = this.getDb();
    const ref = doc(db, "scopes", scope_id, "items", scope_id);
    const snap = await getDoc(ref);
    return snap.exists() && !!snap.data()?.soft_deleted;
  }

  /** Atomically adds a scope to a user's membership list (safe against concurrent edits). */
  async addMembership(user_id: string, scope_id: string): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "meta", "memberships");
    await setDoc(ref, { scopes: arrayUnion(scope_id), updated_at: new Date().toISOString() }, { merge: true });
  }

  /** Atomically removes a scope from a user's membership list (safe against concurrent edits). */
  async removeMembership(user_id: string, scope_id: string): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "meta", "memberships");
    await setDoc(ref, { scopes: arrayRemove(scope_id), updated_at: new Date().toISOString() }, { merge: true });
  }

  async fetchInvites(user_id: string, since?: string): Promise<Pulled<DB.ContactInvite>> {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "invites");
    const snap = await getDocs(sinceQuery(ref, since, orderBy("updated_at", "asc")));
    return toPulled(snap.docs, since, (d, data) => ({ id: d.id, ...data }) as DB.ContactInvite);
  }

  /** Writes the invite to every given inbox in one atomic batch. */
  async upsertInvite(user_ids: string[], invite: DB.ContactInvite): Promise<void> {
    const db = this.getDb();
    const batch = writeBatch(db);
    // contact_name is private to the sender's device.
    const { contact_name: _contact_name, ...shared } = invite;
    for (const user_id of new Set(user_ids)) {
      const ref = doc(db, "users", user_id, "invites", invite.id);
      batch.set(ref, { ...shared, synced_at: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }

  /**
   * Attaches a real-time listener to the user's invite inbox. `callback` fires on remote changes only,
   * not for the initial snapshot (the app pulls invites separately on start).
   * Returns an unsubscribe function.
   */
  subscribeInvites(user_id: string, callback: () => void): () => void {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "invites");
    let is_first = true;
    return onSnapshot(
      ref,
      (snap) => {
        if (is_first) {
          is_first = false;
          return;
        }
        if (snap.docChanges().length > 0 && !snap.metadata.hasPendingWrites) callback();
      },
      (error) => console.warn("[Firestore] invites listener failed:", error),
    );
  }

  /**
   * Attaches a real-time listener to the user's notification inbox. `callback` fires on remote changes only,
   * not for the initial snapshot (the app pulls notifications separately on start).
   * Returns an unsubscribe function.
   */
  subscribeNotifications(user_id: string, callback: () => void): () => void {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "notifications");
    let is_first = true;
    return onSnapshot(
      ref,
      (snap) => {
        if (is_first) {
          is_first = false;
          return;
        }
        if (snap.docChanges().length > 0 && !snap.metadata.hasPendingWrites) callback();
      },
      (error) => console.warn("[Firestore] notifications listener failed:", error),
    );
  }

  /** Stores this device's push token. The Cloud Function reads these to deliver pushes. */
  async savePushToken(user_id: string, device_id: string, token: string, language_code: string): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "push_tokens", device_id);
    await setDoc(ref, { token, language_code, updated_at: new Date().toISOString() }, { merge: true });
  }

  async deletePushToken(user_id: string, device_id: string): Promise<void> {
    const db = this.getDb();
    await deleteDoc(doc(db, "users", user_id, "push_tokens", device_id));
  }

  /** The first pull only takes the newest `count`; later pulls page forward from the cursor, `count` at a time. */
  async fetchNotifications(user_id: string, since?: string, count = 50): Promise<Pulled<DB.Notification>> {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "notifications");
    const q = since
      ? query(sinceQuery(ref, since), limit(count))
      : sinceQuery(ref, since, orderBy("updated_at", "desc"), limit(count));

    const snap = await getDocs(q);
    return toPulled(snap.docs, since, (d, data) => ({ id: d.id, ...data }) as DB.Notification);
  }

  async upsertNotification(user_id: string, notification: DB.Notification): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "notifications", notification.id);
    await setDoc(ref, { ...notification, synced_at: serverTimestamp() }, { merge: true });
  }

  /**
   * Attaches a real-time listener to a scope's items collection. Watches only the most recently synced item (one read
   * per change), and fires on every remote write after the initial snapshot, however old the item's updated_at is.
   * Returns an unsubscribe function — call it to stop listening.
   */
  subscribeItems(scope_id: string, callback: () => void): () => void {
    const db = this.getDb();
    const ref = collection(db, "scopes", scope_id, "items");
    const q = query(ref, orderBy("synced_at", "desc"), limit(1));
    let is_first = true;
    return onSnapshot(
      q,
      (snap) => {
        if (is_first) {
          is_first = false;
          return;
        }
        if (snap.docChanges().length > 0 && !snap.metadata.hasPendingWrites) callback();
      },
      (error) => console.warn(`[Firestore] items listener for scope ${scope_id} failed:`, error),
    );
  }

  /**
   * Attaches a real-time listener to the user's Firestore memberships document.
   * Fires with the current value, then on every change. Cache-only snapshots of a missing document
   * are ignored so an offline start can never wipe the local scope list.
   * Returns an unsubscribe function — call it to stop listening.
   */
  subscribeScopes(firebase_uid: string, callback: (scopes: string[]) => void): () => void {
    const db = this.getDb();
    const ref = doc(db, "users", firebase_uid, "meta", "memberships");
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          if (snap.metadata.fromCache) return;
          return callback([]);
        }
        callback((snap.data().scopes as string[]) ?? []);
      },
      (error) => console.warn("[Firestore] memberships listener failed:", error),
    );
  }

  /**
   * Attaches a real-time listener to the user's API task inbox. `callback` receives the waiting tasks straight
   * from the snapshot (including the initial one), so draining needs no extra fetch.
   * Returns an unsubscribe function.
   */
  subscribeInboxTasks(user_id: string, callback: (tasks: AL.InboxTask[]) => void): () => void {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "inbox_tasks");
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.empty || snap.metadata.hasPendingWrites) return;
        callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AL.InboxTask));
      },
      (error) => console.warn("[Firestore] inbox listener failed:", error),
    );
  }

  async deleteInboxTask(user_id: string, task_id: string): Promise<void> {
    const db = this.getDb();
    await deleteDoc(doc(db, "users", user_id, "inbox_tasks", task_id));
  }

  async fetchApiKeys(user_id: string): Promise<AL.ApiKey[]> {
    const db = this.getDb();
    const snap = await getDocs(query(collection(db, "users", user_id, "api_keys"), orderBy("created_at", "asc")));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AL.ApiKey);
  }

  /** Stores an API key under the sha256 of its secret. The secret itself never leaves the device. */
  async createApiKey(user_id: string, key_hash: string, data: Omit<AL.ApiKey, "id" | "last_used_at">): Promise<void> {
    const db = this.getDb();
    await setDoc(doc(db, "users", user_id, "api_keys", key_hash), data);
  }

  async deleteApiKey(user_id: string, key_hash: string): Promise<void> {
    const db = this.getDb();
    await deleteDoc(doc(db, "users", user_id, "api_keys", key_hash));
  }

  /** Looks up a user's uid and name by email address via the public user_profiles collection. */
  async fetchUserByEmail(email: string): Promise<{ uid: string; email_address: string; name: string } | null> {
    const db = this.getDb();
    const candidates = [...new Set([email, email.toLowerCase()])];
    const q = query(collection(db, "user_profiles"), where("email_address", "in", candidates), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, email_address: d.data().email_address ?? email, name: d.data().name ?? "" };
  }
}

const firestore = new Firestore();
export default firestore;
