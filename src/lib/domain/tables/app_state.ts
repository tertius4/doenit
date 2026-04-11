import type { RxCollection } from "$lib/logic/chunk/rxdb";
import { map, type Observable } from "rxjs";

export class AppStateTable {
  collection: RxCollection<DB.AppState>;

  constructor(collection: RxCollection<DB.AppState>) {
    this.collection = collection;
  }

  async getDevice(): AsyncResult<DB.AppState> {
    try {
      const existing = await this.collection.findOne("current").exec();
      if (existing) {
        return { ok: true, value: existing.toJSON() as DB.AppState };
      }

      const created = await this.collection.insert({
        id: "current",
        device_id: crypto.randomUUID(),
        last_opened_at: new Date().toISOString(),
        open_count: 1,
        app_version: "1.0.0",
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: created.toJSON() as DB.AppState };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  async update(changes: Partial<DB.AppState>): AsyncResult<DB.AppState> {
    try {
      const doc = await this.collection.findOne("current").exec();
      if (!doc) throw new Error("App state not found");

      const updated = await doc.incrementalPatch({
        ...changes,
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: updated.toJSON() as DB.AppState };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  subscribeOne$(id: string): Observable<DB.AppState | null> {
    return this.collection
      .findOne(id)
      .$.pipe(map((doc) => (doc ? (doc.toJSON() as DB.AppState) : null)));
  }
}
