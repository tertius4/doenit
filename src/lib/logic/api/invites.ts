import { apiLogger } from "$lib";
import { InviteService } from "$logic/invites/InviteService";
import { NotificationService } from "$logic/notifications/NotificationService";
import { context } from "$logic/context.svelte";
import firestore from "$services/firestore";
import * as env from "$env/static/public";

const SEND_EMAIL_INVITE_URL = `https://africa-south1-${env.PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendEmailInvite`;

export const send = apiLogger(sendInviteHandler);
export const setContactName = apiLogger(setContactNameHandler);
export const accept = apiLogger(acceptInviteHandler);
export const reject = apiLogger(rejectInviteHandler);
export const cancel = apiLogger(cancelInviteHandler);
export const pull = () => InviteService.pull();
export const sendEmail = apiLogger(sendEmailHandler);
export const fetchEmailInvites = () => InviteService.fetchEmailInvites();
export const answerEmailInvites = apiLogger(answerEmailInvitesHandler);

async function sendInviteHandler(to_email: string): AsyncResult<DB.ContactInvite> {
  const result = await InviteService.send(to_email);
  if (!result.ok) return result;

  const notified = await NotificationService.createInviteReceived(result.value);
  if (!notified.ok) console.warn("[invites] failed to create notification:", notified.error);
  return result;
}

async function setContactNameHandler(invite_id: string, name: string): AsyncResult {
  return InviteService.setContactName(invite_id, name);
}

async function acceptInviteHandler(invite_id: string): AsyncResult {
  const result = await InviteService.accept(invite_id);
  if (!result.ok) return result;

  const notified = await NotificationService.createInviteAccepted(result.value);
  if (!notified.ok) console.warn("[invites] failed to create notification:", notified.error);
  return { ok: true };
}

async function rejectInviteHandler(invite_id: string): AsyncResult {
  return InviteService.reject(invite_id);
}

async function cancelInviteHandler(invite_id: string): AsyncResult {
  return InviteService.cancel(invite_id);
}

/** E-mails an invite to someone who is not on Doenit yet, through the sendEmailInvite function. */
async function sendEmailHandler(email: string): AsyncResult {
  const token = await firestore.getAuth().currentUser?.getIdToken();
  if (!token) return { ok: false, error: "invite_error_not_authenticated" };

  const response = await fetch(SEND_EMAIL_INVITE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, language: context._settings?.language ?? "af" }),
  });
  return response.json().catch(() => ({ ok: false, error: "invite_error_email_failed" }));
}

async function answerEmailInvitesHandler(senders: { uid: string; from_email: string }[], accept: boolean): AsyncResult {
  return InviteService.answerEmailInvites(senders, accept);
}
