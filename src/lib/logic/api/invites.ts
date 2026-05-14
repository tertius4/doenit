import { apiLogger } from "$lib";
import { InviteService } from "$domain/sync/InviteService";

export const send = apiLogger(sendInviteHandler);
export const accept = apiLogger(acceptInviteHandler);
export const reject = apiLogger(rejectInviteHandler);
export const cancel = apiLogger(cancelInviteHandler);
export const pull = () => InviteService.pull();

async function sendInviteHandler(to_email: string): AsyncResult {
  return InviteService.send(to_email);
}

async function acceptInviteHandler(invite_id: string): AsyncResult {
  return InviteService.accept(invite_id);
}

async function rejectInviteHandler(invite_id: string): AsyncResult {
  return InviteService.reject(invite_id);
}

async function cancelInviteHandler(invite_id: string): AsyncResult {
  return InviteService.cancel(invite_id);
}
