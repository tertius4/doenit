import DB from "$domain/db";
import { combineLive } from "./live";
import { context } from "$logic/context.svelte";

/** @returns {import("@tertius4/sinkro-db").Live<AL.ContactListItem[]>} */
export function getList() {
  const contacts = DB.contact.live({ where: { user_id: context.user?.id ?? null } });

  return combineLive([contacts], (contacts) =>
    contacts
      .map((contact) => ({
        id: contact.id,
        firebase_uid: contact.firebase_uid,
        relationship_id: contact.relationship_id,
        name: contact.name,
        email_address: contact.email_address,
        avatar_url: contact.avatar_url,
      }))
      // Contacts start without a name, so sort on what is displayed (name, else email).
      .sort((a, b) => (a.name ?? a.email_address ?? "").localeCompare(b.name ?? b.email_address ?? "")),
  );
}

/** @returns {import("@tertius4/sinkro-db").Live<AL.ContactInviteListItem[]>} */
export function getInviteList() {
  const me = context.user?.firebase_uid ?? null;

  const invites = DB.contact_invite.live({
    where: {
      status: { $in: ["pending", "accepted", "rejected"] },
      $or: [{ from_firebase_uid: me }, { to_firebase_uid: me }],
    },
    sort: ["-updated_at"],
  });

  return combineLive([invites], (invites) =>
    invites.map((invite) => ({
      id: invite.id,
      relationship_id: invite.relationship_id,
      from_firebase_uid: invite.from_firebase_uid,
      from_email: invite.from_email,
      to_firebase_uid: invite.to_firebase_uid,
      to_email: invite.to_email,
      status: invite.status,
      is_incoming: invite.to_firebase_uid === me,
      other_email: invite.to_firebase_uid === me ? invite.from_email : invite.to_email,
    })),
  );
}
