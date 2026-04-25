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
  const members$ = DB.member.subscribe$({ selector: { soft_deleted: { $ne: true } } });
  const contacts$ = DB.contact.subscribe$();

  return combineLatest([groups$, members$, contacts$]).pipe(
    map(([groups, members, contacts]) => {
      const contact_map = new Map(contacts.map((c) => [c.user_id, c]));

      return groups.map((group) => {
        const member_names = members
          .filter((member) => member.scope_id === group.id)
          .map((member) => contact_map.get(member.user_id)?.name)
          .filter(/** @param {string | undefined} n */ (n) => !!n);

        return {
          id: group.id,
          name: group.name,
          owner_id: group.owner_id,
          users: [],
          member_names: /** @type {string[]} */ (member_names),
        };
      });
    }),
  );
}
