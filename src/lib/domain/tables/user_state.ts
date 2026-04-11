import type { RxCollection } from "$lib/logic/chunk/rxdb";
import { map, type Observable } from "rxjs";

export class UserStateTable {
  collection: RxCollection<DB.UserState>;

  constructor(collection: RxCollection<DB.UserState>) {
    this.collection = collection;
  }

  async getDevice(user_id = "device"): AsyncResult<DB.UserState> {
    try {
      const existing = await this.collection.findOne(user_id).exec();
      if (existing) {
        return { ok: true, value: existing.toJSON() as DB.UserState };
      }

      const created = await this.collection.insert({
        user_id,
        last_opened_at: new Date().toISOString(),
        open_count: 1,
        last_rate_prompt_at: new Date().toISOString(),
        last_backed_up: new Date().toISOString(),
        rate_prompt_count: 0,
        has_rated: false,
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: created.toJSON() as DB.UserState };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  async update(user_id: string, changes: Partial<DB.UserState>): AsyncResult<DB.UserState> {
    try {
      const doc = await this.collection.findOne(user_id).exec();
      if (!doc) throw new Error(`User state not found for user_id: ${user_id}`);

      const updated = await doc.incrementalPatch({
        ...changes,
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: updated.toJSON() as DB.UserState };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  subscribeOne$(user_id: string): Observable<DB.UserState | null> {
    return this.collection
      .findOne(user_id)
      .$.pipe(map((doc) => (doc ? (doc.toJSON() as DB.UserState) : null)));
  }
}
