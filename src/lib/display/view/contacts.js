import DB from "$domain/db";
import { map } from "rxjs";
import { context } from "$logic/context.svelte";

/**
 * Fills `list` with the current user's contacts. Use as `onMount(View.contacts.getList(list))`.
 * @param {AL.ContactListItem[]} list
 * @returns {() => () => void}
 */
export function getList(list) {
  return () => {
    const subscription = subscribeContactList().subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * Fills `list` with the invites the current user sent or received. Use as `onMount(View.contacts.getInviteList(list))`.
 * @param {AL.ContactInviteListItem[]} list
 * @returns {() => () => void}
 */
export function getInviteList(list) {
  return () => {
    const subscription = subscribeInviteList().subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * @returns {import("rxjs").Observable<AL.ContactListItem[]>}
 */
function subscribeContactList() {
  return DB.contact.subscribe$({ selector: { user_id: context.user?.id }, sort: [{ name: "asc" }] }).pipe(
    map((contacts) =>
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
    ),
  );
}

/**
 * @returns {import("rxjs").Observable<AL.ContactInviteListItem[]>}
 */
function subscribeInviteList() {
  const me = context.user?.firebase_uid;

  return DB.contact_invite
    .subscribe$({
      selector: {
        status: { $in: ["pending", "accepted", "rejected"] },
        $or: [{ from_firebase_uid: me }, { to_firebase_uid: me }],
      },
      sort: [{ updated_at: "desc" }],
    })
    .pipe(
      map((invites) =>
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
      ),
    );
}
