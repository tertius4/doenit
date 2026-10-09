import * as functions from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { handleDeleteAccount } from "./account/delete-account";
import { handleApi } from "./api/create-task";
import { handleSendPush } from "./notifications/send-push";
import { handleCancelSubscription } from "./subscriptions/cancel-subscription";
import { handleVerifySubscription } from "./subscriptions/verify-subscription";

/** Public API: POST /v1/tasks with a personal API key. See docs/API.md. */
export const api = onRequest(
  // invoker "public": callers authenticate with their API key, not Google IAM.
  { region: "africa-south1", memory: "256MiB", maxInstances: 2, timeoutSeconds: 10, cors: true, invoker: "public" },
  handleApi,
);

/** Deletes the caller's account and cloud data. The caller is authenticated by their Firebase ID token. */
export const deleteAccount = onRequest(
  { region: "africa-south1", memory: "256MiB", maxInstances: 1, timeoutSeconds: 30, cors: true, invoker: "public" },
  handleDeleteAccount,
);

/** Delivers a push for every new inbox notification (users/{uid}/notifications/{id}). */
export const sendPushOnNotification = onDocumentCreated(
  { document: "users/{uid}/notifications/{notification_id}", database: "doenitdb", region: "africa-south1" },
  handleSendPush,
);

// Kept in their original region (us-central1); moving a deployed function requires deleting it first.
export const cancelSubscription = functions.https.onRequest(handleCancelSubscription);
export const verifySubscription = functions.https.onRequest(handleVerifySubscription);
