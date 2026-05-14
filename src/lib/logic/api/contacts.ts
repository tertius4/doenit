import { apiLogger } from "$lib";
import DB from "$lib/domain/db";

export const remove = apiLogger(deleteContactHandler);

async function deleteContactHandler(id: string): AsyncResult {
  try {
    const result = await DB.contact.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Contact not found" };

    await DB.contact.remove(id);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}
