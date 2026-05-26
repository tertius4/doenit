import DB from "$domain/db";
import { combineLatest, map } from "rxjs";
import { context } from "$logic/context.svelte";

/**
 * @param {AL.ContactListItem[]} list
 * @returns {() => void}
 */
export function getList(list) {
  /** @type {import("rxjs").Subscription} */
  let subscription;

  subscribeContactList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @param {AL.ContactInviteListItem[]} list
 * @returns {() => void}
 */
export function getInviteList(list) {
  /** @type {import("rxjs").Subscription} */
  let subscription;

  subscribeInviteList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<import("rxjs").Observable<AL.ContactListItem[]>>}
 */
async function subscribeContactList() {
  return DB.contact.subscribe$({ selector: { user_id: context.user?.id }, sort: [{ name: "asc" }] }).pipe(
    map((contacts) =>
      contacts.map((contact) => ({
        id: contact.id,
        firebase_uid: contact.firebase_uid,
        relationship_id: contact.relationship_id,
        name: contact.name,
        email_address: contact.email_address,
        avatar_url: contact.avatar_url,
      })),
    ),
  );
}

/**
 * @returns {Promise<import("rxjs").Observable<AL.ContactInviteListItem[]>>}
 */
async function subscribeInviteList() {
  const me = context.user?.firebase_uid;
  const contacts$ = DB.contact_invite.subscribe$({
    selector: {
      status: { $in: ["pending", "accepted", "rejected"] },
      $or: [{ from_firebase_uid: me }, { to_firebase_uid: me }],
    },
    sort: [{ updated_at: "desc" }],
  });

  return combineLatest([contacts$]).pipe(
    map(([invites]) => {
      return invites.map((invite) => ({
        id: invite.id,
        relationship_id: invite.relationship_id,
        from_firebase_uid: invite.from_firebase_uid,
        from_email: invite.from_email,
        to_firebase_uid: invite.to_firebase_uid,
        to_email: invite.to_email,
        status: invite.status,
        is_incoming: invite.to_firebase_uid === me,
        other_email: invite.to_firebase_uid === me ? invite.from_email : invite.to_email,
      }));
    }),
  );
}
