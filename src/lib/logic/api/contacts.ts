import { apiLogger } from "$lib";
import DB from "$lib/domain/db";
import { InviteService } from "$logic/invites/InviteService";
import { ContactNames } from "$domain/sync/ContactNames";

export const remove = apiLogger(deleteContactHandler);
export const update = apiLogger(updateContactHandler);

async function deleteContactHandler(id: string): AsyncResult {
  try {
    const result = await DB.contact.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Contact not found" };

    const delete_result = await DB.contact.remove(id);
    if (!delete_result.ok) return delete_result;

    // Without this the accepted invite blocks any future invite between the two users.
    const relationship_result = await InviteService.endRelationship(result.value.relationship_id);
    if (!relationship_result.ok) console.warn("[contacts] could not end relationship:", relationship_result.error);

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function updateContactHandler(id: string, changes: { name: string | null }): AsyncResult {
  try {
    const result = await DB.contact.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Contact not found" };

    const name = changes.name?.trim() || null;
    const update_result = await DB.contact.update(id, { name });
    if (!update_result.ok) return update_result;

    await ContactNames.save(result.value.relationship_id, name).catch((err) =>
      console.warn("[contacts] could not sync the name:", err),
    );

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}
