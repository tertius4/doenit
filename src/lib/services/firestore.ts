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

  /**
   * Fetches all items for a scope from Firestore.
   * Pass `since` (ISO string) to only fetch items updated after that timestamp.
   */
  async fetch(scope_id: string, since?: string): Promise<RemoteDoc[]> {
    const db = this.getDb();
    const ref = collection(db, "scopes", scope_id, "items");
    const q = since
      ? query(ref, where("updated_at", ">", since), orderBy("updated_at", "asc"))
      : query(ref, orderBy("updated_at", "asc"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as RemoteDoc);
  }

  /**
   * Writes a full document to Firestore under its scope.
   * Used for both creates and updates.
   */
  async upsert(col: string, document: DB.MetaDataShared & Record<string, any>): Promise<void> {
    if (!document.scope_id) throw new Error("[Firestore] Cannot upsert document without scope_id");

    const db = this.getDb();
    const ref = doc(db, "scopes", document.scope_id, "items", document.id);
    await setDoc(ref, { ...document, collection: col });
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

  async fetchInvites(user_id: string, since?: string): Promise<DB.ContactInvite[]> {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "invites");
    const q = since
      ? query(ref, where("updated_at", ">", since), orderBy("updated_at", "asc"))
      : query(ref, orderBy("updated_at", "asc"));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DB.ContactInvite);
  }

  /** Writes the invite to every given inbox in one atomic batch. */
  async upsertInvite(user_ids: string[], invite: DB.ContactInvite): Promise<void> {
    const db = this.getDb();
    const batch = writeBatch(db);
    // contact_name is private to the sender's device.
    const { contact_name: _contact_name, ...shared } = invite;
    for (const user_id of new Set(user_ids)) {
      batch.set(doc(db, "users", user_id, "invites", invite.id), shared, { merge: true });
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

  async fetchNotifications(user_id: string, since?: string, count = 50): Promise<DB.Notification[]> {
    const db = this.getDb();
    const ref = collection(db, "users", user_id, "notifications");
    const q = since
      ? query(ref, where("updated_at", ">", since), orderBy("updated_at", "asc"), limit(count))
      : query(ref, orderBy("updated_at", "asc"), limit(count));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DB.Notification);
  }

  async upsertNotification(user_id: string, notification: DB.Notification): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "notifications", notification.id);
    await setDoc(ref, notification, { merge: true });
  }

  /**
   * Attaches a real-time listener to a scope's items collection.
   * Only fires when documents with updated_at > since are written remotely.
   * Returns an unsubscribe function — call it to stop listening.
   */
  subscribeItems(scope_id: string, since: string, callback: () => void): () => void {
    const db = this.getDb();
    const ref = collection(db, "scopes", scope_id, "items");
    const q = query(ref, where("updated_at", ">", since), orderBy("updated_at", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        if (snap.docChanges().length > 0) callback();
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
