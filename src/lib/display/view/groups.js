import DB from "$domain/db";
import { combineLatest, map } from "rxjs";

/**
 * @param {AL.GroupListItem[]} list
 * @returns {() => void}
 */
export function getList(list) {
  /** @type {import("rxjs").Subscription} */
  let subscription;

  subscribeGroupList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<import("rxjs").Observable<AL.GroupListItem[]>>}
 */
async function subscribeGroupList() {
  const groups$ = DB.group.subscribe$({ selector: { soft_deleted: { $ne: true } }, sort: [{ name: "asc" }] });
  const group_contacts$ = DB.group_contact.subscribe$({ selector: { soft_deleted: { $ne: true } } });
  const contacts$ = DB.contact.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([groups$, group_contacts$, contacts$]).pipe(
    map(([groups, group_contacts, contacts]) => {
      const contact_map = new Map(contacts.map((c) => [c.id, c]));

      return groups.map((group) => {
        const member_names = group_contacts
          .filter((gc) => gc.group_id === group.id)
          .map((gc) => contact_map.get(gc.contact_id)?.name)
          .filter(/** @param {string | undefined} n */ (n) => !!n);

        return {
          id: group.id,
          name: group.name,
          owner_user_id: group.owner_user_id,
          users: [],
          member_names: /** @type {string[]} */ (member_names),
        };
      });
    })
  );
}
