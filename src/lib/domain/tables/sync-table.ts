import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";
import { context } from "$logic/context.svelte";
import { err } from "$lib";

export default class Table<T> extends BaseTable<T & DB.MetaDataShared> {
  constructor(collection: RxCollection<T & DB.MetaDataShared>) {
    super(collection);
  }

  async create(item: T): AsyncResult<T & DB.MetaDataShared> {
    try {
      if (!item) throw new Error("[Table] Item is required");

      const date = new Date().toISOString();
      return super.create({
        id: crypto.randomUUID(),
        created_at: date,
        updated_at: date,
        soft_deleted: false,
        version: 0,
        owner_id: context.user?.id || "device",
        device_id: context.app_state.device_id,
        ...item,
      } as T & DB.MetaDataShared);
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

      return super.createMany(new_items);
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
      return super.update(id, {
        ...changes,
        updated_at: new Date().toISOString(),
      } as Partial<T & DB.MetaDataShared>);
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T & DB.MetaDataShared>;
    }
  }

  async remove(id: string): AsyncResult {
    return super.remove(id);
  }

  async removeMany(ids: string[]): AsyncResult {
    return super.removeMany(ids);
  }
}
