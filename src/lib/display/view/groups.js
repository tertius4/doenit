import t from "$display/translate";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import { combineLive } from "./live";

/** @returns {import("@tertius4/sinkro-db").Live<AL.GroupListItem[]>} */
export function getList() {
  return groupList();
}

/**
 * A single group (empty when it is not visible).
 * @param {string} group_id
 * @returns {import("@tertius4/sinkro-db").Live<AL.GroupListItem[]>}
 */
export function getOne(group_id) {
  return groupList(group_id);
}

/**
 * Read inside `$derived(liveQuery(...))`, so the scope filters below never go stale.
 * @param {string} [group_id] Limit to one group.
 * @returns {import("@tertius4/sinkro-db").Live<AL.GroupListItem[]>}
 */
function groupList(group_id) {
  const user_id = context.user?.id ?? null;
  const my_uid = context.user?.firebase_uid ?? null;
  const scope_ids = context.active_scopes;

  const groups = DB.group.live({
    where: {
      $or: [{ scope_id: { $in: scope_ids } }, { owner_id: my_uid }],
      ...(group_id ? { id: group_id } : {}),
    },
    sort: ["name"],
  });
  const members = DB.member.live({ where: { scope_id: { $in: scope_ids } } });
  const contacts = DB.contact.live({ where: { user_id } });
  const tasks = DB.task.live({
    where: { scope_id: group_id ? { $eq: group_id } : { $in: scope_ids }, archived: { $ne: true } },
  });

  return combineLive([groups, members, contacts, tasks], (groups, members, contacts, tasks) => {
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

    // Shared groups only show while the user is an active member, so a left group disappears before sync confirms it.
    const visible = groups.filter(
      (group) => group.owner_id === my_uid || members_map.get(group.id)?.some((m) => m.firebase_uid === my_uid),
    );

    return visible.map((group) => {
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
        owner_id: group.owner_id ?? "",
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
  });
}
