import type { RxCollection } from "$lib/logic/chunk/rxdb";
import db from "$lib/domain/db";

export class SessionTable {
  collection: RxCollection<DB.Session>;

  constructor(collection: RxCollection<DB.Session>) {
    this.collection = collection;
  }

  async get(): AsyncResult<DB.Session> {
    try {
      const existing = await this.collection.findOne().exec();
      if (existing) {
        return { ok: true, value: existing.toJSON() as DB.Session };
      }

      let user_result = await db.user.findOne({ sort: [{ updated_at: "desc" }] });
      const user_id = (user_result.ok && user_result.value?.id) || null;

      const created = await this.collection.insert({ id: "current", user_id });

      return { ok: true, value: created.toJSON() as DB.Session };
    } catch (error) {
      console.error("Error in SessionTable.get:", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  /**
   * If user_id is null, it means the user has logged out.
   * If user_id is a string, it means the user has logged in.
   */
  async update({ user_id }: { user_id: string | null }): AsyncResult<DB.Session> {
    try {
      const created = await this.get();
      if (!created.ok) throw new Error(created.error || "Failed to create session");

      const doc = await this.collection.findOne("current").exec();
      if (!doc) throw new Error("Session document not found");

      const updated = await doc.incrementalPatch({
        id: "current",
        user_id,
      });

      return { ok: true, value: updated.toJSON() as DB.Session };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }
}
