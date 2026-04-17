import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";

export const save = apiLogger(saveGroupHandler);
export const remove = apiLogger(deleteGroupHandler);
export const addContact = apiLogger(addContactHandler);
export const removeContact = apiLogger(removeContactHandler);
export const getGroupContacts = apiLogger(getGroupContactsHandler);
export const getContacts = apiLogger(getContactsHandler);

async function saveGroupHandler({
  id,
  name,
  description,
}: Partial<DB.Group>): AsyncResult<DB.Group> {
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

async function addContactHandler(group_id: string, contact_id: string): AsyncResult<DB.GroupContact> {
  try {
    return DB.group_contact.create({
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

async function removeContactHandler(group_contact_id: string): AsyncResult {
  try {
    await DB.group_contact.update(group_contact_id, { soft_deleted: true });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getGroupContactsHandler(group_id: string): AsyncResult<(DB.GroupContact & { contact: DB.Contact | null })[]> {
  try {
    const gc_result = await DB.group_contact.findMany({
      selector: { group_id, soft_deleted: { $ne: true } },
    });
    if (!gc_result.ok) return gc_result;

    const enriched = await Promise.all(
      gc_result.value.map(async (gc) => {
        const c_result = await DB.contact.findById(gc.contact_id);
        return { ...gc, contact: c_result.ok ? c_result.value : null };
      })
    );

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

