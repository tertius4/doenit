import type { RxCollection } from "$lib/logic/chunk/rxdb";
import { map, type Observable } from "rxjs";

export class UserStateTable {
  collection: RxCollection<DB.UserState>;

  constructor(collection: RxCollection<DB.UserState>) {
    this.collection = collection;
  }

  async get(id: string): AsyncResult<DB.UserState> {
    try {
      const existing = await this.collection.findOne(id).exec();
      if (existing) {
        return { ok: true, value: existing.toJSON() as DB.UserState };
      }

      const created = await this.collection.insert({
        id,
        user_id: id,
        active_scopes: [],
        sync_cursors: {},
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

  async upsert(data: Pick<DB.UserState, "id" | "user_id" | "active_scopes"> & Partial<DB.UserState>): AsyncResult<DB.UserState> {
    try {
      const existing = await this.collection.findOne(data.id).exec();
      if (existing) {
        const updated = await existing.incrementalPatch({
          ...data,
          updated_at: new Date().toISOString(),
        });
        return { ok: true, value: updated.toJSON() as DB.UserState };
      }

      const created = await this.collection.insert({
        sync_cursors: {},
        last_opened_at: new Date().toISOString(),
        open_count: 0,
        last_rate_prompt_at: new Date().toISOString(),
        last_backed_up: new Date().toISOString(),
        rate_prompt_count: 0,
        has_rated: false,
        ...data,
        updated_at: new Date().toISOString(),
      });
      return { ok: true, value: created.toJSON() as DB.UserState };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  async update(id: string, changes: Partial<DB.UserState>): AsyncResult<DB.UserState> {
    try {
      const doc = await this.collection.findOne(id).exec();
      if (!doc) throw new Error(`User state not found for id: ${id}`);

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

  subscribeOne$(id: string): Observable<DB.UserState | null> {
    return this.collection
      .findOne(id)
      .$.pipe(map((doc) => (doc ? (doc.toJSON() as DB.UserState) : null)));
  }
}
