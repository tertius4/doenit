import { getFirestore, initializeFirestore } from "$lib/logic/chunk/firebase-firestore";
import { initializeApp, getApp } from "$lib/logic/chunk/firebase-app";
import { getAuth } from "$lib/logic/chunk/firebase-auth";
import * as env from "$env/static/public";
import { config } from "$lib/config";

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
}

const firestore = new Firestore();
export default firestore;
