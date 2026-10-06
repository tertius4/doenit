import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { Message } from "firebase-admin/messaging";
import type { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { getDb } from "../shared/firebase";

// Matches the in-app inbox types (src/app.d.ts DB.NotificationType).
const PUSH_TYPES = [
  "invite_received",
  "invite_accepted",
  "group_added",
  "group_removed",
  "group_deleted",
  "user_left_group",
  "task_assigned",
  "task_completed",
  "mentioned",
] as const;

/**
 * Delivers a push for every new inbox notification (users/{uid}/notifications/{id}).
 * Recipients and text come from Firestore, never from the caller, so nobody can push arbitrary text to a token.
 * Tokens live in users/{uid}/push_tokens/{device_id}; dead ones are pruned here.
 */
export async function handleSendPush(
  event: FirestoreEvent<QueryDocumentSnapshot | undefined, { uid: string; notification_id: string }>,
): Promise<void> {
  const snapshot = event.data;
  if (!snapshot) return;

  const { uid, notification_id } = event.params;
  const notification = snapshot.data();
  const type = String(notification.type ?? "");
  functions.logger.info(`Push requested for ${uid}: ${type}`);
  if (!(PUSH_TYPES as readonly string[]).includes(type)) return;
  if (notification.user_id !== uid) return;

  const db = getDb();
  const tokens_snapshot = await db.collection("users").doc(uid).collection("push_tokens").get();
  if (tokens_snapshot.empty) {
    functions.logger.info(`No push tokens for ${uid}`);
    return;
  }

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries((notification.data ?? {}) as Record<string, unknown>)) {
    if (typeof value === "string") data[key] = value;
  }

  const devices = tokens_snapshot.docs
    .map((doc) => ({ ref: doc.ref, token: doc.get("token"), language: doc.get("language_code") }))
    .filter((device): device is { ref: typeof device.ref; token: string; language: string } => {
      return typeof device.token === "string" && !!device.token;
    });

  const messages: Message[] = devices.map((device) => {
    const lang = device.language === "en" ? "en" : "af";
    const title = getTemplateTitle(type, lang);
    const body = getTemplateBody(type, lang, data);

    return {
      token: device.token,
      notification: { title, body },
      // Everything in `data` must be a string. The app uses it to open the right screen on tap.
      data: { ...data, type, notification_id },
      android: {
        priority: "high",
        notification: { channelId: "default", priority: "high", defaultSound: true, defaultVibrateTimings: true },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } },
      },
    };
  });
  if (!messages.length) return;

  const response = await admin.app("doenitdb").messaging().sendEach(messages);
  functions.logger.info(`Push to ${uid}: ${response.successCount} sent, ${response.failureCount} failed`);

  // Remove tokens FCM says are gone (app uninstalled, token rotated, signed out elsewhere).
  const dead_codes = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
  await Promise.all(
    response.responses.map(async (result, index) => {
      const code = result.error?.code;
      if (code && dead_codes.includes(code)) await devices[index].ref.delete();
      else if (code) functions.logger.warn(`Push to ${uid} failed: ${code}`);
    }),
  );
}

function getTemplateTitle(type: string, lang: "af" | "en"): string {
  const en = lang === "en";
  switch (type) {
    case "invite_received":
      return en ? "New contact invite" : "Nuwe kontak-uitnodiging";
    case "invite_accepted":
      return en ? "Contact invite accepted" : "Kontak-uitnodiging aanvaar";
    case "group_added":
      return en ? "Added to group" : "By groep gevoeg";
    case "group_removed":
      return en ? "Removed from group" : "Uit groep verwyder";
    case "group_deleted":
      return en ? "Group deleted" : "Groep uitgevee";
    case "user_left_group":
      return en ? "Member left group" : "Lid het groep verlaat";
    case "task_assigned":
      return en ? "New task assigned" : "Nuwe taak toegeken";
    case "task_completed":
      return en ? "A task is done!" : "'n Taak is klaar!";
    default:
      return en ? "Notification" : "Kennisgewing";
  }
}

function getTemplateBody(type: string, lang: "af" | "en", data: Record<string, string>): string {
  const en = lang === "en";
  switch (type) {
    case "invite_received":
      return en ? `${data.email} wants to connect with you.` : `${data.email} wil met jou skakel.`;
    case "invite_accepted":
      return en ? `${data.email} accepted your invite.` : `${data.email} het jou uitnodiging aanvaar.`;
    case "group_added":
      return en ? `You were added to ${data.group_name}.` : `Jy is by ${data.group_name} gevoeg.`;
    case "group_removed":
      return en ? `You were removed from ${data.group_name}.` : `Jy is uit ${data.group_name} verwyder.`;
    case "group_deleted":
      return en ? `${data.group_name} was deleted.` : `${data.group_name} is uitgevee.`;
    case "user_left_group":
      return en ? `${data.user_name} left ${data.group_name}.` : `${data.user_name} het ${data.group_name} verlaat.`;
    case "task_assigned":
      return en ? `Task "${data.task_name}" was assigned to you.` : `Taak "${data.task_name}" is aan jou toegeken.`;
    case "task_completed":
      return en
        ? `${data.user_name} completed "${data.task_name}" in ${data.group_name}.`
        : `${data.user_name} het "${data.task_name}" in ${data.group_name} voltooi.`;
    default:
      return en ? "You have a new notification" : "Jy het 'n nuwe kennisgewing";
  }
}
