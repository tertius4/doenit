import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";

export default class Table<T> extends BaseTable<T & DB.PrivateMetaData> {
  constructor(collection: RxCollection<T & DB.PrivateMetaData>) {
    super(collection);
  }

  async create(item: Partial<T>): AsyncResult<T & DB.PrivateMetaData> {
    return super.create({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    } as T & DB.PrivateMetaData);
  }

  async createMany(items: Partial<T>[]): AsyncResult<(T & DB.PrivateMetaData)[]> {
    if (!items.length) return { ok: true, value: [] } as Result<(T & DB.PrivateMetaData)[]>;

    const date = new Date().toISOString();
    const new_items = items.map((item) => ({
      id: crypto.randomUUID(),
      created_at: date,
      updated_at: date,
      ...item,
    })) as (T & DB.PrivateMetaData)[];

    return super.createMany(new_items);
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T & DB.PrivateMetaData> {
    return super.update(id, {
      updated_at: new Date().toISOString(),
      ...changes,
    } as Partial<T & DB.PrivateMetaData>);
  }
}
