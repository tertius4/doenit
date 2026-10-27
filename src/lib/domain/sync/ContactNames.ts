/**
 * Syncs the names the user gave their contacts while personal sync is on. Contacts themselves are derived from the
 * accepted invites on every device; only the name is the user's own. Stored in users/{uid}/meta/contact_names as
 * { names: { [relationship_id]: name } }, so the same contact matches on every device regardless of its local id.
 */

import DB from "$domain/db";
import firestore from "$services/firestore";

/** The synced names as last seen, and the user they belong to. Empty and null while personal sync is off. */
let names: Record<string, string | null> = {};
let watched_uid: string | null = null;
let unsubscribe: (() => void) | null = null;

export const ContactNames = {
  /** Follows the synced names while personal sync is on. Pass a null uid or `enabled` false to stop. */
  watch(firebase_uid: string | null, enabled: boolean): void {
    const uid = enabled ? firebase_uid : null;
    if (uid === watched_uid) return;

    unsubscribe?.();
    unsubscribe = null;
    names = {};
    watched_uid = uid;
    if (!uid) return;

    unsubscribe = firestore.subscribeContactNames(uid, (remote) => {
      names = remote;
      apply().catch((err) => console.warn("[ContactNames] applying names failed:", err));
    });
  },

  /** The synced name for a relationship, or undefined when there is none. */
  nameFor(relationship_id: string): string | null | undefined {
    return names[relationship_id];
  },

  /** Saves a rename to the cloud while personal sync is on. */
  async save(relationship_id: string, name: string | null): Promise<void> {
    if (!watched_uid) return;
    await firestore.saveContactNames(watched_uid, { [relationship_id]: name });
  },

  /** Uploads the name of every named contact, e.g. when personal sync was just turned on. */
  async uploadAll(firebase_uid: string): Promise<void> {
    const contacts = await DB.contact.findMany();
    if (!contacts.ok) return;

    const named = contacts.value.filter((contact) => contact.name);
    if (!named.length) return;

    await firestore.saveContactNames(
      firebase_uid,
      Object.fromEntries(named.map((contact) => [contact.relationship_id, contact.name])),
    );
  },
};

/** Gives the local contacts their synced names. */
async function apply(): Promise<void> {
  const contacts = await DB.contact.findMany();
  if (!contacts.ok) return;

  for (const contact of contacts.value) {
    const name = names[contact.relationship_id];
    if (name !== undefined && name !== contact.name) await DB.contact.update(contact.id, { name });
  }
}
