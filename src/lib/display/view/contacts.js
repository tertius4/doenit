import DB from "$domain/db";
import { map } from "rxjs";

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
 * @returns {Promise<import("rxjs").Observable<AL.ContactListItem[]>>}
 */
async function subscribeContactList() {
  /** @type {(contact: DB.Contact) => AL.ContactListItem} */
  const formatContact = (contact) => {
    return {
      id: contact.id,
      name: contact.name,
      email_address: contact.email_address,
      avatar: contact.avatar,
    };
  };

  return DB.contact
    .subscribe$({ selector: { soft_deleted: { $ne: true } }, sort: [{ name: "asc" }] })
    .pipe(map((contacts) => contacts.map(formatContact)));
}
