import { apiLogger } from "$lib";
import firestore from "$services/firestore";
import { context } from "$logic/context.svelte";
import { personalScope } from "$domain/sync/personal";
import t from "$display/translate";

export const enable = apiLogger(enableHandler);
export const disable = apiLogger(disableHandler);

/** True while personal tasks sync between the user's devices (the personal scope is active). */
export function isEnabled(): boolean {
  const uid = context.user?.firebase_uid;
  return !!uid && context.active_scopes.includes(personalScope(uid));
}

/**
 * Turns device sync on for the whole account. The memberships listener on every device then adds the personal scope
 * and queues that device's personal tasks and categories.
 */
async function enableHandler(): AsyncResult {
  return setEnabled(true);
}

/** Stops syncing. The cloud copy is kept; local tasks are untouched. */
async function disableHandler(): AsyncResult {
  return setEnabled(false);
}

async function setEnabled(enabled: boolean): AsyncResult {
  const uid = context.user?.firebase_uid;
  if (!uid) return { ok: false, error: t("you_are_not_logged_in") };

  await firestore.setPersonalSync(uid, enabled);
  return { ok: true };
}
