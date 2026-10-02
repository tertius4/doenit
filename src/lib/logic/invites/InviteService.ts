import firestore from "$services/firestore";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import { patchSyncCursors, withClockSkew } from "$domain/sync/cursors";

function relationshipId(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Returns the current user's Firebase UID, used for Firestore paths. */
function myFirebaseUid(): string | null {
  return context.user?.firebase_uid ?? null;
}

/** Returns the current user's local DB id, used for local DB operations. */
/** An invite is only trusted when it is addressed to or sent by me and its relationship id matches its parties. */
function isValidFor(invite: DB.ContactInvite, my_uid: string): boolean {
  if (invite.from_firebase_uid !== my_uid && invite.to_firebase_uid !== my_uid) return false;
  if (invite.from_firebase_uid === invite.to_firebase_uid) return false;

  return invite.relationship_id === relationshipId(invite.from_firebase_uid, invite.to_firebase_uid);
}

function myLocalId(): string | null {
  return context.user?.id ?? null;
}

export const InviteService = {
  async send(to_email: string): AsyncResult<DB.ContactInvite> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    const my_email = context.user?.email_address;
    if (!my_uid || !my_local_id || !my_email) return { ok: false, error: "Not authenticated" };

    to_email = to_email.trim();
    const target = await firestore.fetchUserByEmail(to_email);
    if (!target) return { ok: false, error: "No user found with that email address" };
    if (target.uid === my_uid) return { ok: false, error: "Cannot invite yourself" };

    const relationship_id = relationshipId(my_uid, target.uid);

    const existing = await DB.contact_invite.findByRelationshipId(relationship_id);
    if (existing.ok && existing.value) {
      const s = existing.value.status;
      if (s === "pending" || s === "accepted") {
        return { ok: false, error: "Invite or relationship already exists" };
      }
    }

    const now = new Date().toISOString();
    const invite: DB.ContactInvite = {
      id: crypto.randomUUID(),
      relationship_id,
      from_firebase_uid: my_uid,
      from_email: my_email,
      to_firebase_uid: target.uid,
      to_email: target.email_address,
      status: "pending",
      created_at: now,
      updated_at: now,
      responded_at: null,
    };

    // Write to receiver's inbox so they can discover the invite
    await firestore.upsertInvite([target.uid, my_uid], invite);
    await DB.contact_invite.upsert(invite);
    return { ok: true, value: invite };
  },

  async pull(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const state = await DB.user_state.get(my_local_id);
    const since = state.ok ? withClockSkew(state.value.sync_cursors?.["__invites"]) : undefined;

    const remote = await firestore.fetchInvites(my_uid, since);
    if (!remote.length) return;

    for (const invite of remote) {
      // One bad invite must not block the rest or keep the cursor from advancing.
      try {
        if (!isValidFor(invite, my_uid)) {
          console.warn("[InviteService] Ignoring invalid invite", invite.id);
          continue;
        }

        await this._store(invite);
        await this._process(invite);
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("Failed to process invite", { invite, error: message });
      }
    }

    const latest = remote[remote.length - 1].updated_at;
    await patchSyncCursors(my_local_id, { __invites: latest });
  },

  /**
   * Ends an accepted relationship (e.g. when a contact is removed) by cancelling its invite in both inboxes,
   * so the two users can invite each other again.
   */
  async endRelationship(relationship_id: string): AsyncResult {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "Not authenticated" };

    const result = await DB.contact_invite.findByRelationshipId(relationship_id);
    if (!result.ok) return result;
    if (!result.value || result.value.status !== "accepted") return { ok: true };

    const updated: DB.ContactInvite = { ...result.value, status: "cancelled", updated_at: new Date().toISOString() };
    await firestore.upsertInvite([updated.from_firebase_uid, updated.to_firebase_uid], updated);
    await DB.contact_invite.upsert(updated);
    return { ok: true };
  },

  /** Stores a remote invite locally unless the local copy is already newer. */
  async _store(invite: DB.ContactInvite): Promise<void> {
    const local = await DB.contact_invite.findById(invite.id);
    if (local.ok && local.value && local.value.updated_at > invite.updated_at) return;

    const result = await DB.contact_invite.upsert(invite);
    if (!result.ok) throw new Error(result.error);
  },

  async accept(invite_id: string): AsyncResult<DB.ContactInvite> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return { ok: false, error: "Not authenticated" };

    const result = await DB.contact_invite.findById(invite_id);
    if (!result.ok || !result.value) return { ok: false, error: "Invite not found" };

    const invite = result.value;
    if (invite.to_firebase_uid !== my_uid) return { ok: false, error: "Not your invite" };
    if (invite.status !== "pending") return { ok: false, error: "Invite is no longer pending" };

    const now = new Date().toISOString();
    const updated: DB.ContactInvite = {
      ...invite,
      status: "accepted",
      responded_at: now,
      updated_at: now,
    };

    await firestore.upsertInvite([my_uid, invite.from_firebase_uid], updated);
    await DB.contact_invite.upsert(updated);
    await this._process(updated);
    return { ok: true, value: updated };
  },

  async reject(invite_id: string): AsyncResult {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "Not authenticated" };

    const result = await DB.contact_invite.findById(invite_id);
    if (!result.ok || !result.value) return { ok: false, error: "Invite not found" };

    const invite = result.value;
    if (invite.to_firebase_uid !== my_uid) return { ok: false, error: "Not your invite" };
    if (invite.status !== "pending") return { ok: false, error: "Invite is no longer pending" };

    const now = new Date().toISOString();
    const updated: DB.ContactInvite = { ...invite, status: "rejected", responded_at: now, updated_at: now };

    // Write to the sender's inbox too, otherwise their copy stays "pending" forever.
    await firestore.upsertInvite([my_uid, invite.from_firebase_uid], updated);
    await DB.contact_invite.upsert(updated);
    return { ok: true };
  },

  async cancel(invite_id: string): AsyncResult {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "Not authenticated" };

    const my_local_id = myLocalId();
    if (!my_local_id) return { ok: false, error: "Not authenticated" };

    const result = await DB.contact_invite.findById(invite_id);
    if (!result.ok || !result.value) return { ok: false, error: "Invite not found" };

    const invite = result.value;
    if (invite.from_firebase_uid !== my_uid) return { ok: false, error: "Not your invite to cancel" };
    if (invite.status !== "pending") return { ok: false, error: "Invite is no longer pending" };

    const now = new Date().toISOString();
    const updated: DB.ContactInvite = { ...invite, status: "cancelled", updated_at: now };

    await firestore.upsertInvite([invite.to_firebase_uid, my_uid], updated);
    await DB.contact_invite.upsert(updated);
    return { ok: true };
  },

  /** Creates the local contact for an accepted invite. Serialised per relationship so concurrent callers can't duplicate it. */
  async _process(invite: DB.ContactInvite): Promise<void> {
    if (invite.status !== "accepted") return;

    const previous = processing.get(invite.relationship_id) ?? Promise.resolve();
    const current = previous.then(() => createContact(invite)).finally(() => {
      if (processing.get(invite.relationship_id) === current) processing.delete(invite.relationship_id);
    });
    processing.set(invite.relationship_id, current);

    await current;
  },
};

const processing = new Map<string, Promise<void>>();

async function createContact(invite: DB.ContactInvite): Promise<void> {
  const my_uid = myFirebaseUid();
  const my_local_id = myLocalId();
  if (!my_uid || !my_local_id) return;

  const existing = await DB.contact.findByRelationshipId(invite.relationship_id);
  if (existing.ok && existing.value) return;

  const firebase_uid = invite.from_firebase_uid === my_uid ? invite.to_firebase_uid : invite.from_firebase_uid;
  const contact_email = invite.from_firebase_uid === my_uid ? invite.to_email : invite.from_email;

  await DB.contact.create({
    user_id: my_local_id,
    firebase_uid,
    relationship_id: invite.relationship_id,
    name: null,
    avatar_url: null,
    email_address: contact_email,
  });
}
