import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { syncEngine } from "$lib/domain/sync/engine";

export const save = apiLogger(saveGroupHandler);
export const remove = apiLogger(deleteGroupHandler);
export const addContact = apiLogger(addContactHandler);
export const removeContact = apiLogger(removeContactHandler);
export const getMembers = apiLogger(getMembersHandler);
export const getContacts = apiLogger(getContactsHandler);

async function saveGroupHandler({ id, name, description }: Partial<DB.Group>): AsyncResult<DB.Group> {
  try {
    if (id) {
      return DB.group.update(id, { name, description });
    } else {
      return DB.group.create({
        name: name || "",
        description,
        owner_user_id: context.user?.id || "device",
      } as any);
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

async function addContactHandler(group_id: string, contact_id: string): AsyncResult<DB.Member> {
  try {
    return DB.member.create({
      group_id,
      contact_id,
      role: "member",
      owner_user_id: context.user?.id || "device",
    } as any);
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function removeContactHandler(member_id: string): AsyncResult {
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
      selector: { id: { $in: members.map((gc) => gc.user_id) } },
    });

    const hash: Record<string, DB.Contact> = {};
    if (contact_result.ok) {
      for (const contact of contact_result.value) {
        hash[contact.user_id] = contact;
      }
    }

    const enriched = members.map((member) => ({
      ...member,
      contact: hash[member.user_id] || null,
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
      selector: { soft_deleted: { $ne: true } },
      sort: [{ name: "asc" }],
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}
