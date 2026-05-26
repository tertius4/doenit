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
  const tasks$ = DB.task.subscribe$({ selector: { archived: { $ne: true }, soft_deleted: { $ne: true } } });

  return combineLatest([groups$, members$, contacts$, tasks$]).pipe(
    map(([groups, members, contacts, tasks]) => {
      const contact_map = new Map(contacts.map((c) => [c.firebase_uid, c]));

      /** @type {Map<string, number>} */
      const task_count_map = new Map();
      for (const task of tasks) {
        if (!task.scope_id) continue;
        task_count_map.set(task.scope_id, (task_count_map.get(task.scope_id) || 0) + 1);
      }

      return groups.map((group) => {
        /** @type {AL.GroupListItem["members"]} */
        const formatted_names = [];

        for (const member of members) {
          if (member.scope_id !== group.id) continue;

          const contact = contact_map.get(member.firebase_uid);
          if (!contact) continue;

          const name = contact.name || contact.email_address;
          if (!name) continue;

          const is_admin = member.role === "admin";
          formatted_names.push({ name, is_admin });
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          owner_id: group.owner_id,
          task_count: task_count_map.get(group.id) || 0,
          members: formatted_names /* .sort((a, b) => {
            if (a.is_admin && !b.is_admin) return -1;
            if (!a.is_admin && b.is_admin) return 1;
            return a.name.localeCompare(b.name);
          }) */,
        };
      });
    }),
  );
}
