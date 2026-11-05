import db from "$lib/domain/db";
import BaseTable from "./base-table";

const ID = "current";

export class SessionTable extends BaseTable<DB.Session> {
  async get(): AsyncResult<DB.Session> {
    const existing = await this.findById(ID);
    if (!existing.ok) return existing;
    if (existing.value) return { ok: true, value: existing.value };

    const user_result = await db.user.findOne({ sort: ["-updated_at"] });
    const user_id = (user_result.ok && user_result.value?.id) || null;

    return this.create({ id: ID, user_id });
  }

  /**
   * If user_id is null, it means the user has logged out.
   * If user_id is a string, it means the user has logged in.
   */
  async setUser(user_id: string | null): AsyncResult<DB.Session> {
    const created = await this.get();
    if (!created.ok) return created;

    return created.value.user_id === user_id ? created : super.update(ID, { user_id });
  }
}
