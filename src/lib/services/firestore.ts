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
  where,
} from "$lib/logic/chunk/firebase-firestore";
import { initializeApp, getApp } from "$lib/logic/chunk/firebase-app";
import { getAuth } from "$lib/logic/chunk/firebase-auth";
import * as env from "$env/static/public";
import { config } from "$lib/config";

export type RemoteDoc = DB.MetaDataShared & { scope_id: string; collection: string };

class Firestore {
  private initialized = false;

  init() {
    if (this.initialized) return;

    this.initialized = true;
    const app = initializeApp(config.firebase_config, env.PUBLIC_APP_ID);
    initializeFirestore(app, {});
  }

  /** Returns the Firestore instance. Requires firestore.init() to have been called. */
  getDb() {
    return getFirestore(getApp(env.PUBLIC_APP_ID), env.PUBLIC_FIREBASE_DB_NAME);
  }

  /** Returns the Auth instance. Requires firestore.init() to have been called. */
  getAuth() {
    return getAuth(getApp(env.PUBLIC_APP_ID));
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

  async upsertMemberships(user_id: string, scopes: string[]): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "meta", "memberships");
    await setDoc(ref, { scopes: scopes.filter(Boolean), updated_at: new Date().toISOString() }, { merge: true });
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

  async upsertInvite(user_id: string, invite: DB.ContactInvite): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, "users", user_id, "invites", invite.id);
    await setDoc(ref, invite, { merge: true });
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
    return onSnapshot(q, (snap) => {
      if (snap.docChanges().length > 0) callback();
    });
  }

  /**
   * Attaches a real-time listener to the user's Firestore memberships document.
   * Fires immediately with the current value (or [] if offline/missing), then on every change.
   * Returns an unsubscribe function — call it to stop listening.
   */
  subscribeScopes(firebase_uid: string, callback: (scopes: string[]) => void): () => void {
    console.log("firebase_uid", firebase_uid);
    const db = this.getDb();
    const ref = doc(db, "users", firebase_uid, "meta", "memberships");
    return onSnapshot(ref, (snap) => {
      console.log("snap.data()", snap.data());
      callback(snap.exists() ? ((snap.data().scopes as string[]) ?? []) : []);
    });
  }

  /** Looks up a user's uid and name by email address via the public user_profiles collection. */
  async fetchUserByEmail(email: string): Promise<{ uid: string; email_address: string; name: string } | null> {
    const db = this.getDb();
    const q = query(collection(db, "user_profiles"), where("email_address", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, email_address: email, name: d.data().name ?? "" };
  }
}

const firestore = new Firestore();
export default firestore;
