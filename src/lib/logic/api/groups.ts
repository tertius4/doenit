import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { SyncQueue } from "$domain/sync/SyncQueue";
import t from "$display/translate";
import { NotificationService } from "$domain/notifications/NotificationService";

export const save = apiLogger(saveGroupHandler);
export const remove = apiLogger(deleteGroupHandler);
export const addMember = apiLogger(addMemberHandler);
export const removeMember = apiLogger(removeMemberHandler);
export const getMembers = apiLogger(getMembersHandler);
export const getContacts = apiLogger(getContactsHandler);
export const getById = apiLogger(getByIdHandler);

async function saveGroupHandler({ id, name, description }: Partial<DB.Group>): AsyncResult<DB.Group> {
  try {
    const group_name = name?.trim();
    if (!group_name) return { ok: false, error: "Group name is required" };

    if (id) {
      return DB.group.update(id, { name: group_name, description });
    }

    const result = await DB.group.create({
      name: group_name,
      description,
      owner_id: context.user?.id || "device",
    } as Domain.Group);

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function deleteGroupHandler(id: string): AsyncResult {
  try {
    const result = await DB.group.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Group not found" };

    const group = result.value;
    const group_scope_id = group.scope_id;
    const member_ids: string[] = [];

    if (group_scope_id) {
      const members_result = await DB.member.findMany({
        selector: { scope_id: group_scope_id, soft_deleted: { $ne: true } },
      });
      if (members_result.ok) {
        member_ids.push(...members_result.value.map((member) => member.id));
        await notifyRemovedMembers(members_result.value, group);

        const membership_removals = members_result.value
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
    }

    if (member_ids.length) {
      const member_delete_result = await DB.member.removeMany(member_ids);
      if (!member_delete_result.ok) return member_delete_result;
    }

    const delete_result = await DB.group.remove(id);
    if (!delete_result.ok) return delete_result;

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function addMemberHandler(group_id: string, contact_id: string): AsyncResult<DB.Member> {
  try {
    const group_result = await DB.group.findById(group_id);
    if (!group_result.ok) return group_result;
    if (!group_result.value || group_result.value.soft_deleted) return { ok: false, error: "Group not found" };

    const contact_result = await DB.contact.findById(contact_id);
    if (!contact_result.ok) return contact_result;

    const contact = contact_result.value;
    if (!contact) return { ok: false, error: "Contact not found" };

    const firebase_uid = contact.firebase_uid;
    if (!firebase_uid) return { ok: false, error: "Contact is not linked to a user" };

    const group = await ensureGroupScope(group_result.value);
    if (!group.ok) return group;

    const owner_result = await ensureOwnerMember(group.value.id);
    if (!owner_result.ok) return owner_result;

    const existing_member = await DB.member.findOne({
      selector: {
        scope_id: group.value.id,
        firebase_uid,
      },
    });
    if (!existing_member.ok) return existing_member;

    const result = await upsertMember(group.value.id, firebase_uid, "member");
    if (!result.ok) return result;

    await enqueueMembership(firebase_uid, group.value.id);
    if (!existing_member.value || existing_member.value.soft_deleted) {
      await NotificationService.createAddedToGroup(firebase_uid, group.value);
    }
    return result;
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
    if (member_result.value.soft_deleted) return { ok: true };

    const result = await DB.member.update(member_id, { soft_deleted: true });
    if (!result.ok) return result;

    await enqueueMembershipRemoval(member_result.value.firebase_uid, member_result.value.scope_id);
    const group_result = member_result.value.scope_id ? await DB.group.findById(member_result.value.scope_id) : null;
    if (group_result?.ok && group_result.value && member_result.value.firebase_uid !== context.user?.firebase_uid) {
      await NotificationService.createRemovedFromGroup(member_result.value.firebase_uid, group_result.value);
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getMembersHandler(
  group_id: string,
): AsyncResult<(DB.Member & { contact: { name?: string; email_address: string } | null })[]> {
  try {
    const result = await DB.member.findMany({
      selector: { scope_id: group_id, soft_deleted: { $ne: true } },
    });
    if (!result.ok) return result;

    const members = result.value;
    const contact_result = await DB.contact.findMany({
      selector: { firebase_uid: { $in: members.map((gc) => gc.firebase_uid) } },
    });

    const hash: Record<string, { name?: string; email_address: string }> = {
      [context.user?.firebase_uid || ""]: {
        name: t("you"),
        email_address: context.user?.email_address || "",
      },
    };
    if (contact_result.ok) {
      for (const contact of contact_result.value) {
        if (!contact.firebase_uid) continue;

        hash[contact.firebase_uid] = {
          email_address: contact.email_address || "",
          name: contact.name || "",
        };
      }
    }

    const enriched = members.map((member) => ({
      ...member,
      contact: hash[member.firebase_uid] || null,
    }));

    return { ok: true, value: enriched };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getContactsHandler(): AsyncResult<DB.Contact[]> {
  try {
    return DB.contact.findMany({
      sort: [{ name: "asc" }],
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getByIdHandler(id: string): AsyncResult<DB.Group> {
  try {
    const result = await DB.group.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Group not found" };

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

async function upsertMember(group_id: string, firebase_uid: string, role: DB.Member["role"]): AsyncResult<DB.Member> {
  const existing_result = await DB.member.findOne({
    selector: {
      scope_id: group_id,
      firebase_uid,
    },
  });
  if (!existing_result.ok) return existing_result;

  const existing = existing_result.value;
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

async function notifyRemovedMembers(members: DB.Member[], group: DB.Group) {
  const current_firebase_uid = context.user?.firebase_uid;
  await Promise.all(
    members
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid && !member.soft_deleted)
      .map(async (member) => {
        const result = await NotificationService.createRemovedFromGroup(member.firebase_uid, group);
        if (!result.ok) {
          console.warn("[groups] failed to create group removal notification:", result.error);
        }
      }),
  );
}
