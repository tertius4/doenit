import firestore from "$services/firestore";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import { cursorKey, patchSyncCursors } from "$domain/sync/cursors";
import { NotificationService } from "$logic/notifications/NotificationService";
import { ContactNames } from "$domain/sync/ContactNames";
import { generateCode, normalizeCode } from "./invite-code.svelte";

/**
 * An invite as stored in Firestore. `via_code` (remote only, never stored locally) is the receiver's invite code the
 * sender used, so the receiver's device accepts it on its own.
 */
type RemoteInvite = DB.ContactInvite & { via_code?: string };

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
    if (!myFirebaseUid()) return { ok: false, error: "invite_error_not_authenticated" };

    const target = await firestore.fetchUserByEmail(to_email.trim());
    if (!target) return { ok: false, error: "invite_error_no_user" };
    return this.sendTo(target);
  },

  /** Sends a contact invite to a user whose uid is already known. `via_code` is their invite code, when that is how. */
  async sendTo(target: { uid: string; email_address: string }, via_code?: string): AsyncResult<DB.ContactInvite> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    const my_email = context.user?.email_address;
    if (!my_uid || !my_local_id || !my_email) return { ok: false, error: "invite_error_not_authenticated" };
    if (target.uid === my_uid) return { ok: false, error: "invite_error_self" };

    const relationship_id = relationshipId(my_uid, target.uid);

    const existing = await DB.contact_invite.findAllByRelationshipId(relationship_id);
    if (existing.ok && existing.value.some((i) => i.status === "pending" || i.status === "accepted")) {
      return { ok: false, error: "invite_error_exists" };
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
    await firestore.upsertInvite([target.uid, my_uid], via_code ? { ...invite, via_code } : invite);
    await DB.contact_invite.upsert(invite);
    return { ok: true, value: invite };
  },

  async pull(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const state = await DB.user_state.get(my_local_id);
    const key = cursorKey("__invites");
    const since = state.ok ? state.value.sync_cursors?.[key] : undefined;

    const { docs: remote, cursor } = await firestore.fetchInvites(my_uid, since);

    for (const invite of remote) {
      // One bad invite must not block the rest or keep the cursor from advancing.
      try {
        if (!isValidFor(invite, my_uid)) {
          console.warn("[InviteService] Ignoring invalid invite", invite.id);
          continue;
        }

        // A stale remote copy (older than ours, e.g. "accepted" after we removed the contact) must not be acted on.
        const { via_code, ...stored } = invite as RemoteInvite;
        const is_stored = await this._store(stored);
        if (is_stored) await this._process(stored);
        if (is_stored) await this._acceptIfEmailInvited(stored, my_uid);
        if (is_stored && via_code) await this._acceptIfInvitedByCode(stored, via_code, my_uid);
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("Failed to process invite", { invite, error: message });
      }
    }

    if (cursor !== since) await patchSyncCursors(my_local_id, { [key]: cursor }, ["__invites"]);
    await this.reconcileContacts();
  },

  /**
   * Makes the local contacts match the accepted invites. Removes contacts whose relationship ended (removed on another
   * device or by the other person) and creates any that are missing. Local only, so it costs no Firestore reads.
   */
  async reconcileContacts(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const [invites, contacts] = await Promise.all([
      DB.contact_invite.findMany({ selector: { status: "accepted" } }),
      DB.contact.findMany({ selector: { user_id: my_local_id } }),
    ]);
    if (!invites.ok || !contacts.ok) return;

    const accepted = invites.value.filter((invite) => isValidFor(invite, my_uid));
    const relationship_ids = new Set(accepted.map((invite) => invite.relationship_id));
    const stale = contacts.value.filter((contact) => !relationship_ids.has(contact.relationship_id));
    if (stale.length) await DB.contact.removeMany(stale.map((contact) => contact.id));

    for (const invite of accepted) await this._process(invite);
  },

  /**
   * Someone I invited by e-mail joined and sent me an invite: accept it on their behalf, since I asked for it.
   * Only incoming pending invites cost a read.
   */
  async _acceptIfEmailInvited(invite: DB.ContactInvite, my_uid: string): Promise<void> {
    if (invite.status !== "pending" || invite.to_firebase_uid !== my_uid) return;
    if (!(await firestore.hasEmailInvite(invite.from_email, my_uid))) return;

    const result = await this.accept(invite.id);
    if (!result.ok) return console.warn("[InviteService] auto-accept failed:", result.error);

    await firestore.deleteEmailInvite(invite.from_email, my_uid);
    const notified = await NotificationService.createInviteAccepted(result.value);
    if (!notified.ok) console.warn("[InviteService] failed to create notification:", notified.error);
  },

  /**
   * Someone used my invite code (a link, QR code or typed in) and sent me an invite: accept it, since sharing the code
   * was my invitation. Only if the code is still mine, so a replaced code stops working.
   */
  async _acceptIfInvitedByCode(invite: DB.ContactInvite, via_code: string, my_uid: string): Promise<void> {
    if (invite.status !== "pending" || invite.to_firebase_uid !== my_uid) return;
    if ((await firestore.fetchInviteCodeOwner(via_code)) !== my_uid) return;

    const result = await this.accept(invite.id);
    if (!result.ok) return console.warn("[InviteService] auto-accept by code failed:", result.error);

    const notified = await NotificationService.createInviteAccepted(result.value);
    if (!notified.ok) console.warn("[InviteService] failed to create notification:", notified.error);
  },

  /** My invite code, made the first time it is asked for. */
  async myCode(): AsyncResult<string> {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

    const existing = await firestore.fetchMyInviteCode(my_uid);
    if (existing) return { ok: true, value: existing };
    return this._claimCode(my_uid, null);
  },

  /** Replaces my invite code, so links and codes shared before stop working. */
  async resetCode(): AsyncResult<string> {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

    return this._claimCode(my_uid, await firestore.fetchMyInviteCode(my_uid));
  },

  async _claimCode(my_uid: string, previous: string | null): AsyncResult<string> {
    // A taken code fails the write; with 32^6 codes a few tries are plenty.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      try {
        await firestore.saveInviteCode(my_uid, code, previous);
        return { ok: true, value: code };
      } catch (error) {
        console.warn("[InviteService] could not claim invite code:", error);
      }
    }
    return { ok: false, error: "invite_error_code_failed" };
  },

  /** Who an invite code belongs to. */
  async lookupCode(input: string): AsyncResult<{ uid: string; email_address: string; name: string }> {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

    const code = normalizeCode(input);
    if (!code) return { ok: false, error: "invite_error_code_invalid" };

    const owner = await firestore.fetchInviteCodeOwner(code);
    if (!owner) return { ok: false, error: "invite_error_code_unknown" };
    if (owner === my_uid) return { ok: false, error: "invite_error_self" };

    const profile = await firestore.fetchUserProfile(owner);
    if (!profile) return { ok: false, error: "invite_error_code_unknown" };
    return { ok: true, value: profile };
  },

  /** Sends an invite to the owner of an invite code. Their device accepts it on its own (see _acceptIfInvitedByCode). */
  async sendByCode(input: string): AsyncResult<DB.ContactInvite> {
    const code = normalizeCode(input);
    if (!code) return { ok: false, error: "invite_error_code_invalid" };

    const target = await this.lookupCode(code);
    if (!target.ok) return target;
    return this.sendTo(target.value, code);
  },

  /** People who invited my e-mail address before I joined Doenit. */
  async fetchEmailInvites(): Promise<{ uid: string; from_email: string; from_name: string }[]> {
    const my_email = context.user?.email_address;
    if (!my_email) return [];
    return firestore.fetchEmailInvites(my_email);
  },

  /**
   * Answers the e-mail invites. Accepting sends each inviter a normal invite, which their device accepts on its own
   * (see _acceptIfEmailInvited) and then clears; declining clears them here.
   */
  async answerEmailInvites(senders: { uid: string; from_email: string }[], accept: boolean): AsyncResult {
    const my_email = context.user?.email_address;
    if (!my_email) return { ok: false, error: "invite_error_not_authenticated" };

    for (const sender of senders) {
      if (!accept) {
        await firestore.deleteEmailInvite(my_email, sender.uid);
        continue;
      }

      const result = await this.sendTo({ uid: sender.uid, email_address: sender.from_email });
      if (result.ok) {
        const notified = await NotificationService.createInviteReceived(result.value);
        if (!notified.ok) console.warn("[InviteService] failed to create notification:", notified.error);
      } else if (result.error === "invite_error_exists") {
        // Already connected or invited some other way.
        await firestore.deleteEmailInvite(my_email, sender.uid);
      } else {
        return result;
      }
    }
    return { ok: true };
  },

  /**
   * Ends an accepted relationship (e.g. when a contact is removed) by cancelling its invite in both inboxes,
   * so the two users can invite each other again.
   */
  async endRelationship(relationship_id: string): AsyncResult {
    const my_uid = myFirebaseUid();
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

    const result = await DB.contact_invite.findAllByRelationshipId(relationship_id);
    if (!result.ok) return result;

    // There can be several invites for one relationship; cancel every accepted one, not just the first found.
    for (const invite of result.value.filter((i) => i.status === "accepted")) {
      const updated: DB.ContactInvite = { ...invite, status: "cancelled", updated_at: new Date().toISOString() };
      // Record it locally first, so the contact stays removed even if the remote write fails.
      await DB.contact_invite.upsert(updated);
      try {
        await firestore.upsertInvite([updated.from_firebase_uid, updated.to_firebase_uid], updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.warn("[InviteService] could not end relationship remotely:", message);
        return { ok: false, error: message };
      }
    }
    return { ok: true };
  },

  /** Stores a remote invite locally unless the local copy is already newer. */
  async _store(invite: DB.ContactInvite): Promise<boolean> {
    const local = await DB.contact_invite.findById(invite.id);
    if (local.ok && local.value && local.value.updated_at > invite.updated_at) return false;

    // Remote copies never carry contact_name, so keep the one saved locally.
    const contact_name = local.ok && local.value ? local.value.contact_name : undefined;
    const result = await DB.contact_invite.upsert(contact_name ? { ...invite, contact_name } : invite);
    if (!result.ok) throw new Error(result.error);
    return true;
  },

  /** Saves the name the sender wants for the invitee. Local only; applied to the contact once the invite is accepted. */
  async setContactName(invite_id: string, name: string): AsyncResult {
    const result = await DB.contact_invite.findById(invite_id);
    if (!result.ok || !result.value) return { ok: false, error: "Invite not found" };

    const saved = await DB.contact_invite.upsert({ ...result.value, contact_name: name.trim() || null });
    console.log("[InviteService] saved contact name", { invite_id, name, saved });
    if (!saved.ok) return saved;
    return { ok: true };
  },

  async accept(invite_id: string): AsyncResult<DB.ContactInvite> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return { ok: false, error: "invite_error_not_authenticated" };

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
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

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
    if (!my_uid) return { ok: false, error: "invite_error_not_authenticated" };

    const my_local_id = myLocalId();
    if (!my_local_id) return { ok: false, error: "invite_error_not_authenticated" };

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

  // The remote copy never carries the sender's chosen name, so read it from the local invite.
  let local_invite = await DB.contact_invite.findById(invite.id);
  if (!local_invite.ok || !local_invite.value) local_invite = await DB.contact_invite.findByRelationshipId(invite.relationship_id);
  const invite_name = (invite.contact_name ?? (local_invite.ok ? local_invite.value?.contact_name : null)) || null;
  // A name given on another device wins; a name only this device knows is shared with the others.
  const synced_name = ContactNames.nameFor(invite.relationship_id);
  const name = synced_name !== undefined ? synced_name : invite_name;
  console.log("[InviteService] creating contact", { invite_id: invite.id, name, local_invite });

  await DB.contact.create({
    user_id: my_local_id,
    firebase_uid,
    relationship_id: invite.relationship_id,
    name,
    avatar_url: null,
    email_address: contact_email,
  });
  if (synced_name === undefined && name) {
    await ContactNames.save(invite.relationship_id, name).catch((err) =>
      console.warn("[InviteService] could not sync the contact name:", err),
    );
  }
}
