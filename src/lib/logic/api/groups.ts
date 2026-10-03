import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { SyncQueue } from "$domain/sync/SyncQueue";
import { NotificationService } from "$logic/notifications/NotificationService";

export const save = apiLogger(saveGroupHandler);
export const remove = apiLogger(deleteGroupHandler);
export const addMember = apiLogger(addMemberHandler);
export const removeMember = apiLogger(removeMemberHandler);
export const getMembers = apiLogger(getMembersHandler);
export const getContacts = apiLogger(getContactsHandler);
export const getById = apiLogger(getByIdHandler);

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 250;

async function saveGroupHandler({ id, name, description }: Partial<DB.Group>): AsyncResult<DB.Group> {
  try {
    const group_name = name?.trim();
    const group_description = description?.trim() ?? "";
    if (!group_name) return { ok: false, error: "Group name is required" };
    if (group_name.length > MAX_NAME_LENGTH) return { ok: false, error: "Group name is too long" };
    if (group_description.length > MAX_DESCRIPTION_LENGTH) return { ok: false, error: "Group description is too long" };

    if (id) {
      const admin = await requireAdmin(id);
      if (!admin.ok) return admin;

      return DB.group.update(id, { name: group_name, description: group_description });
    }

    if (!context.user?.id) return { ok: false, error: "Log in to create a group" };

    const result = await DB.group.create({
      name: group_name,
      description: group_description,
      owner_id: context.user.id,
    } as Domain.Group);

    if (!result.ok) throw Error(result.error);

    // The group exists at this point; a failed enqueue must not make the caller retry and create a duplicate.
    await enqueueMembership(context.user.firebase_uid, result.value.id).catch((err) =>
      console.warn("[groups] failed to enqueue owner membership:", err),
    );

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function deleteGroupHandler(id: string): AsyncResult {
  try {
    const admin = await requireAdmin(id);
    if (!admin.ok) return admin;
    if (admin.value.owner_id !== context.user?.id) {
      return { ok: false, error: "Only the group owner can disband it" };
    }

    const group = admin.value;
    const group_scope_id = group.scope_id;
    const member_ids: string[] = [];
    const task_ids: string[] = [];
    const removed_members: DB.Member[] = [];

    if (group_scope_id) {
      const [members_result, tasks_result] = await Promise.all([
        DB.member.findMany({ selector: { scope_id: group_scope_id, soft_deleted: { $ne: true } } }),
        DB.task.findMany({ selector: { scope_id: group_scope_id, soft_deleted: { $ne: true } } }),
      ]);
      if (!members_result.ok) return members_result;
      if (!tasks_result.ok) return tasks_result;

      member_ids.push(...members_result.value.map((member) => member.id));
      task_ids.push(...tasks_result.value.map((task) => task.id));

      // Content first: the tombstones must be queued before members lose access to the scope.
      if (task_ids.length) {
        const task_delete_result = await DB.task.removeMany(task_ids);
        if (!task_delete_result.ok) return task_delete_result;
      }

      removed_members.push(...members_result.value);
    }

    if (member_ids.length) {
      const member_delete_result = await DB.member.removeMany(member_ids);
      if (!member_delete_result.ok) return member_delete_result;
    }

    const delete_result = await DB.group.remove(id);
    if (!delete_result.ok) return delete_result;

    // Only after the group is really gone.
    await notifyDeletedGroup(removed_members, group);

    // Membership removals go last: pushing the tombstones above requires the scope membership they revoke.
    if (group_scope_id) {
      const membership_removals = removed_members
        .filter((m) => m.firebase_uid)
        .map((m) => ({
          table_name: "membership",
          entity_id: m.firebase_uid,
          scope_id: group_scope_id,
          op: "delete" as const,
        }));

      if (membership_removals.length) {
        await SyncQueue.enqueueMany(membership_removals);
      }
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function addMemberHandler(group_id: string, contact_id: string): AsyncResult<GroupMember> {
  try {
    const admin = await requireAdmin(group_id);
    if (!admin.ok) return admin;

    const contact_result = await DB.contact.findById(contact_id);
    if (!contact_result.ok) return contact_result;

    const contact = contact_result.value;
    if (!contact || contact.user_id !== context.user?.id) return { ok: false, error: "Contact not found" };

    const firebase_uid = contact.firebase_uid;
    if (!firebase_uid) return { ok: false, error: "Contact is not linked to a user" };

    const had_scope = !!admin.value.scope_id;
    const group = await ensureGroupScope(admin.value);
    if (!group.ok) return group;

    const owner_result = await ensureOwnerMember(group.value.id);
    if (!owner_result.ok) return owner_result;

    const existing_member = await findMember(group.value.id, firebase_uid);
    if (!existing_member.ok) return existing_member;

    const result = await upsertMember(group.value.id, firebase_uid, "member", existing_member.value);
    if (!result.ok) return result;

    // The owner's own membership is needed as well, or the owner never subscribes to the new scope.
    if (!had_scope) await enqueueMembership(context.user?.firebase_uid, group.value.id);
    await enqueueMembership(firebase_uid, group.value.id);
    if (!existing_member.value || existing_member.value.soft_deleted) {
      await NotificationService.createAddedToGroup(firebase_uid, group.value).then(warnOnFailure);
    }

    return {
      ok: true,
      value: {
        ...result.value,
        is_me: false,
        contact: { name: contact.name || "", email_address: contact.email_address || "" },
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function removeMemberHandler(member_id: string): AsyncResult {
  try {
    const member_result = await DB.member.findById(member_id);
    if (!member_result.ok) return member_result;
    if (!member_result.value) return { ok: false, error: "Member not found" };

    const member = member_result.value;
    if (member.soft_deleted) return { ok: true };

    const group_result = member.scope_id ? await DB.group.findById(member.scope_id) : null;
    const group = group_result?.ok ? group_result.value : null;

    const is_self = member.firebase_uid === context.user?.firebase_uid;
    if (is_self) {
      if (group && group.owner_id === context.user?.id) {
        return { ok: false, error: "The owner cannot leave the group. Disband it instead." };
      }
    } else {
      if (!group) return { ok: false, error: "Group not found" };

      const admin = await requireAdmin(group.id);
      if (!admin.ok) return admin;

      // Admin rows belong to the group owner and can't be removed by anyone else.
      if (member.role === "admin") return { ok: false, error: "Not allowed to remove the group owner" };
    }

    const result = await DB.member.update(member_id, { soft_deleted: true });
    if (!result.ok) return result;

    await enqueueMembershipRemoval(member.firebase_uid, member.scope_id);
    if (group && is_self) {
      await notifyMemberLeft(group);
    } else if (group) {
      await NotificationService.createRemovedFromGroup(member.firebase_uid, group).then(warnOnFailure);
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

export type GroupMember = DB.Member & {
  is_me: boolean;
  contact: { name?: string; email_address: string } | null;
};

async function getMembersHandler(group_id: string): AsyncResult<GroupMember[]> {
  try {
    const result = await DB.member.findMany({
      selector: { scope_id: group_id, soft_deleted: { $ne: true } },
    });
    if (!result.ok) return result;

    const members = result.value;
    const contact_result = context.user?.id
      ? await DB.contact.findMany({
          selector: { user_id: context.user.id, firebase_uid: { $in: members.map((gc) => gc.firebase_uid) } },
        })
      : null;

    const my_uid = context.user?.firebase_uid;
    const hash: Record<string, { name?: string; email_address: string }> = {};
    if (contact_result?.ok) {
      for (const contact of contact_result.value) {
        if (!contact.firebase_uid) continue;
        // Several contacts can point at the same user; keep the one that has a name.
        if (hash[contact.firebase_uid]?.name && !contact.name) continue;

        hash[contact.firebase_uid] = {
          email_address: contact.email_address || "",
          name: contact.name || "",
        };
      }
    }

    const enriched = members.map((member) => {
      const is_me = !!my_uid && member.firebase_uid === my_uid;
      return {
        ...member,
        is_me,
        contact: is_me
          ? { name: "", email_address: context.user?.email_address || "" }
          : hash[member.firebase_uid] || null,
      };
    });

    return { ok: true, value: enriched };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/** Contacts that can be added to a group, i.e. the ones linked to a user. */
async function getContactsHandler(): AsyncResult<DB.Contact[]> {
  if (!context.user?.id) return { ok: true, value: [] };

  const result = await DB.contact.findMany({
    selector: { user_id: context.user.id },
    sort: [{ name: "asc" }],
  });
  if (!result.ok) return result;

  return { ok: true, value: result.value.filter((contact) => !!contact.firebase_uid) };
}

async function getByIdHandler(id: string): AsyncResult<DB.Group> {
  try {
    const result = await DB.group.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Group not found" };

    // Make sure the user may access the group
    const group = result.value;
    if (group.scope_id) {
      if (!context.user_state.active_scopes.includes(group.scope_id)) {
        return { ok: false, error: "Group not found" };
      }

      const member_result = await DB.member.findOne({
        selector: {
          scope_id: group.scope_id,
          firebase_uid: context.user?.firebase_uid,
          soft_deleted: { $ne: true },
        },
      });
      if (!member_result.ok) return member_result;
      if (!member_result.value) return { ok: false, error: "Group not found" };
    } else {
      // If the group doesn't have a scope_id, only the owner can access it
      if (group.owner_id !== context.user?.id) {
        return { ok: false, error: "Group not found" };
      }
    }

    return { ok: true, value: result.value };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function ensureGroupScope(group: DB.Group): AsyncResult<DB.Group> {
  if (group.scope_id) return { ok: true, value: group };

  return DB.group.update(group.id, { scope_id: group.id });
}

async function ensureOwnerMember(group_id: string): AsyncResult<DB.Member | null> {
  const firebase_uid = context.user?.firebase_uid;
  if (!firebase_uid) return { ok: true, value: null };

  return upsertMember(group_id, firebase_uid, "admin");
}

function findMember(group_id: string, firebase_uid: string): AsyncResult<DB.Member | null> {
  return DB.member.findOne({ selector: { scope_id: group_id, firebase_uid } });
}

/** Creates or revives a member row. Pass `known` (null = none) to skip the lookup when the caller already did it. */
async function upsertMember(
  group_id: string,
  firebase_uid: string,
  role: DB.Member["role"],
  known?: DB.Member | null,
): AsyncResult<DB.Member> {
  let existing = known;
  if (existing === undefined) {
    const existing_result = await findMember(group_id, firebase_uid);
    if (!existing_result.ok) return existing_result;
    existing = existing_result.value;
  }

  if (existing) {
    if (existing.role === role && !existing.soft_deleted) {
      return { ok: true, value: existing };
    }

    return DB.member.update(existing.id, {
      role,
      soft_deleted: false,
      scope_id: group_id,
      firebase_uid,
    } as Partial<DB.Member>);
  }

  return DB.member.create({
    scope_id: group_id,
    firebase_uid,
    role,
    owner_id: context.user?.id || "device",
  } as Domain.Member);
}

/** Resolves the group and verifies the current user may administer it (owner, or an admin member). */
async function requireAdmin(group_id: string): AsyncResult<DB.Group> {
  const group_result = await DB.group.findById(group_id);
  if (!group_result.ok) return group_result;

  const group = group_result.value;
  if (!group || group.soft_deleted) return { ok: false, error: "Group not found" };

  const my_id = context.user?.id;
  if (!my_id) return { ok: false, error: "Not authenticated" };
  if (group.owner_id === my_id) return { ok: true, value: group };

  const my_uid = context.user?.firebase_uid;
  if (group.scope_id && my_uid) {
    const member = await findMember(group.scope_id, my_uid);
    if (member.ok && member.value && !member.value.soft_deleted && member.value.role === "admin") {
      return { ok: true, value: group };
    }
  }

  return { ok: false, error: "Only a group admin can do this" };
}

async function enqueueMembership(firebase_uid: string | undefined, group_id: string) {
  if (!firebase_uid) return;

  await SyncQueue.enqueue({
    table_name: "membership",
    entity_id: firebase_uid,
    scope_id: group_id,
    op: "upsert",
  });
}

async function enqueueMembershipRemoval(firebase_uid: string | undefined, group_id: string | null) {
  if (!firebase_uid || !group_id) return;

  await SyncQueue.enqueue({
    table_name: "membership",
    entity_id: firebase_uid,
    scope_id: group_id,
    op: "delete",
  });
}

async function notifyDeletedGroup(members: DB.Member[], group: DB.Group) {
  const current_firebase_uid = context.user?.firebase_uid;
  await Promise.all(
    members
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid && !member.soft_deleted)
      .map((member) => NotificationService.createGroupDeleted(member.firebase_uid, group).then(warnOnFailure)),
  );
}

async function notifyMemberLeft(group: DB.Group) {
  const current_firebase_uid = context.user?.firebase_uid;
  const members = await DB.member.findMany({ selector: { scope_id: group.id, soft_deleted: { $ne: true } } });
  if (!members.ok) return;

  const user_name = context.user?.name || context.user?.email_address || "";
  await Promise.all(
    members.value
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid)
      .map((member) =>
        NotificationService.createUserLeftGroup(member.firebase_uid, group, user_name).then(warnOnFailure),
      ),
  );
}

function warnOnFailure(result: Result<unknown>) {
  if (!result.ok) console.warn("[groups] failed to create notification:", result.error);
}
