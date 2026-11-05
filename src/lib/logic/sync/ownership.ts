/**
 * Who owns personal tasks and categories on this device. `owner_id` is the local user id ("device" while signed out),
 * which differs per device, so it is set here locally and never synced as a change (it is not merged per field).
 */

import DB from "$domain/db";
import { PERSONAL_TABLES } from "./personal";

/** Gives every personal document whose owner passes `isTarget` to `owner_id`. Direct writes, nothing is queued. */
async function setOwner(isTarget: (owner_id: string) => boolean, owner_id: string): Promise<void> {
  for (const table_name of PERSONAL_TABLES) {
    const table = DB.getCollection(table_name);
    if (!table) continue;

    const docs = await table.collection.find().exec();
    const targets = docs.filter((doc: any) => !doc.scope_id && doc.owner_id !== owner_id && isTarget(doc.owner_id));
    await Promise.all(targets.map((doc: any) => doc.incrementalModify((data: any) => ({ ...data, owner_id }))));
  }
}

/**
 * Makes the signed-in user the owner of personal documents no local user owns: tasks made while signed out
 * ("device"), and documents that arrived through Sync or the API with another device's owner id.
 */
export async function claimPersonalData(user_id: string): Promise<void> {
  const users = await DB.user.findMany();
  if (!users.ok) return;

  const known = new Set(users.value.map((user) => user.id));
  await setOwner((owner_id) => !known.has(owner_id), user_id);
}

/** Hands a removed user's personal documents to the device, so they stay usable signed out. */
export async function releasePersonalData(user_id: string): Promise<void> {
  await setOwner((owner_id) => owner_id === user_id, "device");
}
