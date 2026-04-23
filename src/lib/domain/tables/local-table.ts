import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";

export default class Table<T> extends BaseTable<T & DB.MetaDataPrivate> {
  constructor(collection: RxCollection<T & DB.MetaDataPrivate>) {
    super(collection);
  }

  async create(item: Partial<T>): AsyncResult<T & DB.MetaDataPrivate> {
    return super.create({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    } as T & DB.MetaDataPrivate);
  }

  async createMany(items: Partial<T>[]): AsyncResult<(T & DB.MetaDataPrivate)[]> {
    if (!items.length) return { ok: true, value: [] } as Result<(T & DB.MetaDataPrivate)[]>;

    const date = new Date().toISOString();
    const new_items = items.map((item) => ({
      id: crypto.randomUUID(),
      created_at: date,
      updated_at: date,
      ...item,
    })) as (T & DB.MetaDataPrivate)[];

    return super.createMany(new_items);
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T & DB.MetaDataPrivate> {
    return super.update(id, {
      updated_at: new Date().toISOString(),
      ...changes,
    } as Partial<T & DB.MetaDataPrivate>);
  }
}
