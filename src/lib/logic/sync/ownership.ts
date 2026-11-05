/**
 * Personal tasks and categories change hands by moving between the `local` channel and the user's personal channel.
 * Another account on this device never reaches them: queries stay inside the signed-in user's channels.
 */

import DB from "$domain/db";
import { LOCAL_CHANNEL, personalChannel } from "$domain/sinkro/tables";

async function moveAll(from: string, to: string): Promise<void> {
  for (const table of [DB.task, DB.category]) {
    const docs = await table.findMany({ where: { channel: from } });
    if (!docs.ok) throw new Error(docs.error);

    for (const doc of docs.value) {
      const moved = await table.moveChannel(doc.id, to);
      if (!moved.ok) throw new Error(moved.error);
    }
  }
}

/** Makes the signed-in user the owner of what was made signed out. */
export function claimLocalData(firebase_uid: string): Promise<void> {
  return moveAll(LOCAL_CHANNEL, personalChannel(firebase_uid));
}

/** Hands a removed user's personal documents to the device, so they stay usable signed out. */
export function releasePersonalData(firebase_uid: string): Promise<void> {
  return moveAll(personalChannel(firebase_uid), LOCAL_CHANNEL);
}

/**
 * Another account signed in on this device: clears what the previous one synced, which comes back when they do. Personal
 * data that never left this device (Sync off) is not in their scopes, so it stays, out of sight, until they sign in.
 */
export async function forgetPreviousUser(firebase_uid: string): Promise<void> {
  const device = await DB.app_state.getDevice();
  if (!device.ok) throw new Error(device.error);

  const previous_uid = device.value.last_firebase_uid;
  if (previous_uid === firebase_uid) return;

  const previous_user = previous_uid ? await DB.user.findOne({ where: { firebase_uid: previous_uid } }) : null;
  const user_id = previous_user?.ok ? previous_user.value?.id : null;
  const state = user_id ? await DB.user_state.findById(user_id) : null;

  if (user_id && state?.ok && state.value) {
    for (const channel of state.value.active_scopes ?? []) await DB.sync.forgetChannel(channel);
    await DB.user_state.update(user_id, { active_scopes: [] });
  }

  // Orders the previous account left behind can't run under this one.
  const orders = await DB.membership_queue.findMany();
  if (orders.ok) await DB.membership_queue.removeMany(orders.value.map((order) => order.id));

  const saved = await DB.app_state.patch({ last_firebase_uid: firebase_uid });
  if (!saved.ok) throw new Error(saved.error);
}
