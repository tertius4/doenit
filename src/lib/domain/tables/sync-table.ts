import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";
import { context } from "$logic/context.svelte";
import { err } from "$lib";
import { SyncQueue } from "$domain/sync/SyncQueue";

export default class Table<T> extends BaseTable<T & DB.MetaDataShared> {
  constructor(collection: RxCollection<T & DB.MetaDataShared>) {
    super(collection);
  }

  /** Inserts a fully-formed document directly, bypassing the sync queue. Use for applying remote changes. */
  async createRaw(item: T & DB.MetaDataShared): AsyncResult<T & DB.MetaDataShared> {
    try {
      if (!item) throw new Error("[Table] Item is required");
      return await super.create(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return err(message) as Result<T & DB.MetaDataShared>;
    }
  }

  /** Updates a document directly, bypassing the sync queue. Use for applying remote changes. */
  async updateRaw(id: string, changes: Partial<T & DB.MetaDataShared>): AsyncResult<T & DB.MetaDataShared> {
    try {
      const test = await super.update(id, changes);
      return test as Result<T & DB.MetaDataShared>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T & DB.MetaDataShared>;
    }
  }

  async create(item: T): AsyncResult<T & DB.MetaDataShared> {
    try {
      if (!item) throw new Error("[Table] Item is required");

      const date = new Date().toISOString();
      const result = await super.create({
        id: crypto.randomUUID(),
        created_at: date,
        updated_at: date,
        soft_deleted: false,
        version: 0,
        owner_id: context.user?.id || "device",
        device_id: context.app_state.device_id,
        ...item,
      } as T & DB.MetaDataShared);

      if (!result.ok) return result;

      const doc = result.value as T & DB.MetaDataShared;
      await this.afterWrite(doc);

      return { ok: true, value: doc } as Result<T & DB.MetaDataShared>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return err(message) as Result<T & DB.MetaDataShared>;
    }
  }

  async createMany(items: T[]): AsyncResult<(T & DB.MetaDataShared)[]> {
    try {
      if (!items.length) return { ok: true, value: [] };

      const date = new Date().toISOString();
      const new_items = items.map((item) => ({
        id: crypto.randomUUID(),
        created_at: date,
        updated_at: date,
        soft_deleted: false,
        version: 0,
        owner_id: context.user?.id || "device",
        device_id: context.app_state.device_id,
        ...item,
      })) as (T & DB.MetaDataShared)[];

      const result = await super.createMany(new_items);
      if (!result.ok) return result;

      await this.afterWriteMany(result.value);

      return { ok: true, value: result.value } as Result<(T & DB.MetaDataShared)[]>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message };
    }
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T & DB.MetaDataShared> {
    if (!Object.keys(changes).length) throw new Error("[Table] No changes provided");

    const doc = await this.collection.findOne(id).exec();
    if (!doc) throw new Error(`[Table] Cannot update: document with id "${id}" not found`);

    try {
      const currentDoc = doc.toJSON() as T & DB.MetaDataShared;
      const result = await super.update(id, {
        ...changes,
        updated_at: new Date().toISOString(),
        version: currentDoc.version + 1,
      } as Partial<T & DB.MetaDataShared>);
      if (!result.ok) return result;

      const updatedDoc = result.value as T & DB.MetaDataShared;
      await this.afterWrite(updatedDoc);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T & DB.MetaDataShared>;
    }
  }

  async remove(id: string): AsyncResult {
    const result = await this.update(id, { soft_deleted: true } as Partial<T>);
    if (!result.ok) return result;

    return { ok: true };
  }

  async removeMany(ids: string[]): AsyncResult {
    const results = await Promise.all(ids.map((id) => this.remove(id)));
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) return failed;

    return { ok: true };
  }

  private async afterWriteMany(docs: (T & DB.MetaDataShared)[]) {
    const items = docs
      .filter((doc) => doc.scope_id)
      .map((doc) => ({
        table_name: this.collection.name,
        entity_id: doc.id,
        scope_id: doc.scope_id!,
        op: (doc.soft_deleted ? "delete" : "upsert") as "delete" | "upsert",
      }));

    if (items.length) {
      await SyncQueue.enqueueMany(items);
    }
  }

  private async afterWrite(doc: T & DB.MetaDataShared) {
    if (!doc.scope_id) return;

    await SyncQueue.enqueue({
      table_name: this.collection.name,
      entity_id: doc.id,
      scope_id: doc.scope_id,
      op: doc.soft_deleted ? "delete" : "upsert",
    });
  }
}
