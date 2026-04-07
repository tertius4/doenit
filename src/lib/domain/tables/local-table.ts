import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";

export default class Table<T extends DB.PrivateMetaData> extends BaseTable<T> {
  constructor(collection: RxCollection<T>) {
    super(collection);
  }

  async create(item: Partial<T>): AsyncResult<T> {
    return super.create({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    } as T);
  }

  async createMany(items: Partial<T>[]): AsyncResult<T[]> {
    if (!items.length) return { ok: true, value: [] } as Result<T[]>;

    const date = new Date().toISOString();
    const new_items = items.map((item) => ({
      id: crypto.randomUUID(),
      created_at: date,
      updated_at: date,
      ...item,
    })) as T[];

    return super.createMany(new_items);
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T> {
    return super.update(id, {
      updated_at: new Date().toISOString(),
      ...changes,
    });
  }
}
