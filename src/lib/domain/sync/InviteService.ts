import firestore from "$services/firestore";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";

function relationshipId(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Returns the current user's Firebase UID, used for Firestore paths. */
function myFirebaseUid(): string | null {
  return context.user?.firebase_uid ?? null;
}

/** Returns the current user's local DB id, used for local DB operations. */
function myLocalId(): string | null {
  return context.user?.id ?? null;
}

export const InviteService = {
  async send(to_email: string): AsyncResult {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    const my_email = context.user?.email_address;
    if (!my_uid || !my_local_id || !my_email) return { ok: false, error: "Not authenticated" };

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
      to_email,
      status: "pending",
      created_at: now,
      updated_at: now,
      responded_at: null,
    };

    // Write to receiver's inbox so they can discover the invite
    await firestore.upsertInvite(target.uid, invite);
    await firestore.upsertInvite(my_uid, invite);
    await DB.contact_invite.upsert(invite);
    return { ok: true };
  },

  async pull(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const state = await DB.user_state.get(my_local_id);
    const since = state.ok ? state.value.sync_cursors?.["__invites"] : undefined;

    const remote = await firestore.fetchInvites(my_uid, since);
    if (!remote.length) return;

    for (const invite of remote) {
      await DB.contact_invite.upsert(invite).catch((error) => {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("Failed to upsert invite", { invite, error: message });
      });
      await this._process(invite);
    }

    const latest = remote[remote.length - 1].updated_at;
    await DB.user_state.update(my_local_id, {
      sync_cursors: {
        ...(state.ok ? state.value.sync_cursors : {}),
        __invites: latest,
      },
    });
  },

  async accept(invite_id: string): AsyncResult {
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

    await firestore.upsertInvite(my_uid, updated);
    await firestore.upsertInvite(invite.from_firebase_uid, updated);
    await DB.contact_invite.upsert(updated);
    await this._process(updated);
    return { ok: true };
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

    await firestore.upsertInvite(my_uid, updated);
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

    await firestore.upsertInvite(invite.to_firebase_uid, updated);
    await firestore.upsertInvite(my_uid, updated);
    await DB.contact_invite.upsert(updated);
    return { ok: true };
  },

  async _process(invite: DB.ContactInvite): Promise<void> {
    if (invite.status !== "accepted") return;

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
  },
};
