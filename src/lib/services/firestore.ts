import { getFirestore, initializeFirestore } from "$lib/logic/chunk/firebase-firestore";
import { initializeApp, getApp } from "$lib/logic/chunk/firebase-app";
import { getAuth } from "$lib/logic/chunk/firebase-auth";
import * as env from "$env/static/public";
import { config } from "$lib/config";
import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore/lite";

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
}

const firestore = new Firestore();
export default firestore;
