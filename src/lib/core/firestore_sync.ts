import { APP_NAME, FIREBASE_CONFIG } from "$lib";
import { FirestoreSync } from "$lib/tools/src";
import { getApp, initializeApp } from "firebase/app";
import { type Firestore, getFirestore } from "firebase/firestore";

function getFirestoreInstance(): Firestore {
  let app;

  try {
    app = getApp(APP_NAME);
  } catch {
    app = initializeApp(FIREBASE_CONFIG, APP_NAME);
  }

  return getFirestore(app, "doenitdb");
}

export const firestore_sync = new FirestoreSync({
  db: getFirestoreInstance(),
  // ??
  //   collection: "user",
  //   docId: "",
  //   preferencesKey: ""
});
