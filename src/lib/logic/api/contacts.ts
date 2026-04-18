import t from "$display/translate";
import { apiLogger } from "$lib";
import DB from "$lib/domain/db";

export const save = apiLogger(saveContactHandler);
export const remove = apiLogger(deleteContactHandler);

async function saveContactHandler({ id, name, email_address, avatar }: Partial<DB.Contact>): AsyncResult<DB.Contact> {
  try {
    if (!name?.trim()) {
      return { ok: false, error: t("contact_name_required") };
    }

    if (!email_address?.trim()) {
      return { ok: false, error: t("contact_email_required") };
    }

    if (!email_address.trim().toLowerCase().endsWith("@gmail.com")) {
      return { ok: false, error: t("email_must_be_gmail") };
    }

    if (id) {
      return DB.contact.update(id, { name, email_address, avatar });
    } else {
      return DB.contact.create({
        name: name || "",
        email_address: email_address || "",
        avatar,
        user_id: id || "",
      });
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function deleteContactHandler(id: string): AsyncResult {
  try {
    const result = await DB.contact.findById(id);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: "Contact not found" };

    await DB.contact.update(id, { soft_deleted: true });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}
