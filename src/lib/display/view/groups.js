import t from "$display/translate";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import { combineLatest, distinctUntilChanged, map, switchMap } from "rxjs";

/**
 * Fills `list` with the groups the current user can see. Use as `onMount(View.groups.getList(list))`.
 * @param {AL.GroupListItem[]} list
 * @returns {() => () => void}
 */
export function getList(list) {
  return () => {
    const subscription = subscribeGroupList().subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * Fills `list` with a single group (empty when it is not visible). Use as `onMount(View.groups.getOne(id, list))`.
 * @param {string} group_id
 * @param {AL.GroupListItem[]} list
 * @returns {() => () => void}
 */
export function getOne(group_id, list) {
  return () => {
    const subscription = subscribeGroupList(group_id).subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * Re-emits whenever the user's memberships change, so the scope filters below never go stale.
 * @param {string} [group_id] Limit to one group.
 * @returns {import("rxjs").Observable<AL.GroupListItem[]>}
 */
function subscribeGroupList(group_id) {
  const user_id = context.user?.id;
  const my_uid = context.user?.firebase_uid;

  const scope_ids$ = DB.user_state.subscribeOne$(user_id || "device").pipe(
    map((state) => state?.active_scopes ?? []),
    distinctUntilChanged((a, b) => a.length === b.length && a.every((id, i) => id === b[i])),
  );

  return scope_ids$.pipe(
    switchMap((scope_ids) => {
      const groups$ = DB.group.subscribe$({
        selector: {
          $or: [{ scope_id: { $in: scope_ids } }, { owner_id: user_id }],
          soft_deleted: { $ne: true },
          ...(group_id ? { id: group_id } : {}),
        },
        sort: [{ name: "asc" }],
      });
      const members$ = DB.member.subscribe$({
        selector: { scope_id: { $in: scope_ids }, soft_deleted: { $ne: true } },
      });
      const contacts$ = DB.contact.subscribe$({ selector: { user_id } });
      const tasks$ = DB.task.subscribe$({
        selector: {
          scope_id: group_id ? { $eq: group_id } : { $in: scope_ids },
          archived: { $ne: true },
          soft_deleted: { $ne: true },
        },
      });

      return combineLatest([groups$, members$, contacts$, tasks$]);
    }),
    map(([groups, members, contacts, tasks]) => {
      const contact_map = new Map(contacts.map((c) => [c.firebase_uid, c]));

      /** @type {Map<string, number>} */
      const task_count_map = new Map();
      for (const task of tasks) {
        if (!task.scope_id) continue;
        task_count_map.set(task.scope_id, (task_count_map.get(task.scope_id) || 0) + 1);
      }

      /** @type {Map<string, DB.Member[]>} */
      const members_map = new Map();
      for (const member of members) {
        if (!member.scope_id) continue;
        const group_members = members_map.get(member.scope_id);
        if (group_members) group_members.push(member);
        else members_map.set(member.scope_id, [member]);
      }

      return groups.map((group) => {
        /** @type {AL.GroupListItem["members"]} */
        const formatted_names = [];

        for (const member of members_map.get(group.id) ?? []) {
          const is_admin = member.role === "admin";
          if (my_uid && member.firebase_uid === my_uid) {
            formatted_names.push({ name: t("you"), is_admin, is_me: true });
            continue;
          }

          // Members the viewer has no contact for are still members: show them rather than hiding them.
          const contact = contact_map.get(member.firebase_uid);
          const name = contact?.name || contact?.email_address || t("unknown_member");
          formatted_names.push({ name, is_admin });
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          owner_id: group.owner_id,
          task_count: task_count_map.get(group.id) || 0,
          members: formatted_names.sort((a, b) => {
            if (a.is_me && !b.is_me) return -1;
            if (!a.is_me && b.is_me) return 1;
            if (a.is_admin && !b.is_admin) return -1;
            if (!a.is_admin && b.is_admin) return 1;
            return a.name.localeCompare(b.name);
          }),
        };
      });
    }),
    // Emissions that produce an identical list must not re-render every card.
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}
