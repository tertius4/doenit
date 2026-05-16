import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { MembershipService } from "$domain/sync/MembershipService";

export const save = apiLogger(saveGroupHandler);
export const remove = apiLogger(deleteGroupHandler);
export const addMember = apiLogger(addMemberHandler);
export const removeMember = apiLogger(removeMemberHandler);
export const getMembers = apiLogger(getMembersHandler);
export const getContacts = apiLogger(getContactsHandler);
export const getById = apiLogger(getByIdHandler);

async function saveGroupHandler({ id, name, description }: Partial<DB.Group>): AsyncResult<DB.Group> {
  try {
    if (id) {
      return DB.group.update(id, { name, description });
    } else {
      const result = await DB.group.create({
        name: name || "",
        description,
        owner_id: context.user?.id || "device",
      } as any);
      if (result.ok && context.user?.firebase_uid) {
        // TODO: Wat as ek nie aanlyn is nie?
        await MembershipService.addScope(context.user.firebase_uid, result.value.id);
      }
      return result;
    }
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

    await DB.group.update(id, { soft_deleted: true });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function addMemberHandler(group_id: string, contact_id: string): AsyncResult<DB.Member> {
  try {
    const contact_result = await DB.contact.findById(contact_id);
    if (!contact_result.ok) return contact_result;

    const contact = contact_result.value;
    if (!contact) return { ok: false, error: "Contact not found" };

    const firebase_uid = contact.firebase_uid;
    if (!firebase_uid) return { ok: false, error: "Contact is not linked to a user" };

    const result = await DB.member.create({
      scope_id: group_id,
      firebase_uid: firebase_uid,
      role: "member",
      owner_id: context.user?.id || "device",
    });

    // Check that group has scope_id
    const group_result = await DB.group.findById(group_id);
    if (!group_result.ok) return group_result;
    if (!group_result.value) return { ok: false, error: "Group not found" };
    if (!group_result.value.scope_id) {
      // Update group with scope_id
      await DB.group.update(group_id, { scope_id: group_id });
      await DB.member.create({
        scope_id: group_id,
        firebase_uid: context.user?.firebase_uid || "",
        role: "admin",
        owner_id: context.user?.id || "device",
      });
    }

    if (result.ok) {
      await MembershipService.addScope(firebase_uid, group_id);
    }
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function removeMemberHandler(member_id: string): AsyncResult {
  try {
    await DB.member.update(member_id, { soft_deleted: true });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getMembersHandler(group_id: string): AsyncResult<(DB.Member & { contact: DB.Contact | null })[]> {
  try {
    const result = await DB.member.findMany({
      selector: { scope_id: group_id, soft_deleted: { $ne: true } },
    });
    if (!result.ok) return result;

    const members = result.value;
    const contact_result = await DB.contact.findMany({
      selector: { firebase_uid: { $in: members.map((gc) => gc.firebase_uid) } },
    });

    const hash: Record<string, DB.Contact> = {};
    if (contact_result.ok) {
      for (const contact of contact_result.value) {
        if (contact.firebase_uid) {
          hash[contact.firebase_uid] = contact;
        }
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
