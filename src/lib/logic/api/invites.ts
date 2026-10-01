import { apiLogger } from "$lib";
import { InviteService } from "$domain/sync/InviteService";
import { NotificationService } from "$logic/notifications/NotificationService";

export const send = apiLogger(sendInviteHandler);
export const accept = apiLogger(acceptInviteHandler);
export const reject = apiLogger(rejectInviteHandler);
export const cancel = apiLogger(cancelInviteHandler);
export const pull = () => InviteService.pull();

async function sendInviteHandler(to_email: string): AsyncResult {
  const result = await InviteService.send(to_email);
  if (!result.ok) return result;

  await NotificationService.createInviteReceived(result.value);
  return { ok: true };
}

async function acceptInviteHandler(invite_id: string): AsyncResult {
  const result = await InviteService.accept(invite_id);
  if (!result.ok) return result;

  await NotificationService.createInviteAccepted(result.value);
  return { ok: true };
}

async function rejectInviteHandler(invite_id: string): AsyncResult {
  return InviteService.reject(invite_id);
}

async function cancelInviteHandler(invite_id: string): AsyncResult {
  return InviteService.cancel(invite_id);
}
