import { apiLogger } from "$lib";
import { InviteService } from "$logic/invites/InviteService";
import { NotificationService } from "$logic/notifications/NotificationService";

export const send = apiLogger(sendInviteHandler);
export const setContactName = apiLogger(setContactNameHandler);
export const accept = apiLogger(acceptInviteHandler);
export const reject = apiLogger(rejectInviteHandler);
export const cancel = apiLogger(cancelInviteHandler);
export const pull = () => InviteService.pull();

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
