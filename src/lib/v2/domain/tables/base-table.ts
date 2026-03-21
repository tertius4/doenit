import type { MangoQuery, RxCollection } from "$logic/chunk/rxdb";
import { map, type Observable } from "rxjs";

export default class Table<T> {
  collection: RxCollection<T & DB.MetaData>;

  constructor(collection: RxCollection<T & DB.MetaData>) {
    this.collection = collection;
  }

  async create(item: Partial<T>): AsyncResult<T & DB.MetaData> {
    try {
      if (!item) throw new Error("[Table] Item is required");

      item = {
        id: crypto.randomUUID(),
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        soft_deleted: false,
        version: 0,
        ...item,
      } as T & DB.MetaData;

      const result = await this.collection.insert(item as T & DB.MetaData);
      const new_item = result.toJSON() as T & DB.MetaData;
      return { ok: true, value: new_item } as Result<T & DB.MetaData>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T & DB.MetaData>;
    }
  }

  async createMany(items: Partial<T>[]): AsyncResult<T[]> {
    if (!items.length) return { ok: true, value: [] } as Result<T[]>;

    const date = new Date().toISOString();
    const new_items = items.map((item) => ({
      id: crypto.randomUUID(),
      archived: false,
      created_at: date,
      updated_at: date,
      soft_deleted: false,
      version: 0,
      dirty: false,
      ...item,
    }));

    try {
      const result = await this.collection.bulkInsert(new_items as (T & DB.MetaData)[]);
      const value = result.success.map((doc) => doc.toJSON() as T & DB.MetaData);
      return { ok: true, value } as Result<T[]>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<T[]>;
    }
  }

  async findById(id: string): AsyncResult<(T & DB.MetaData) | null> {
    try {
      const doc = await this.collection.findOne(id).exec();
      const value = doc ? (doc.toJSON() as T & DB.MetaData) : null;
      return { ok: true, value } as Result<(T & DB.MetaData) | null>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<(T & DB.MetaData) | null>;
    }
  }

  async findOne(query: MangoQuery<T & DB.MetaData>): AsyncResult<(T & DB.MetaData) | null> {
    try {
      const doc = await this.collection.findOne(query).exec();
      const value = doc ? (doc.toJSON() as T & DB.MetaData) : null;
      return { ok: true, value } as Result<(T & DB.MetaData) | null>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<(T & DB.MetaData) | null>;
    }
  }

  async findMany(query?: MangoQuery<T & DB.MetaData>): AsyncResult<(T & DB.MetaData)[]> {
    try {
      const docs = await this.collection.find(query).exec();
      const values = docs.map((doc) => doc.toJSON() as T & DB.MetaData);
      return { ok: true, value: values } as Result<(T & DB.MetaData)[]>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<(T & DB.MetaData)[]>;
    }
  }

  async count(query?: MangoQuery<T & DB.MetaData>): AsyncResult<number> {
    try {
      const count = await this.collection.count(query).exec();
      return { ok: true, value: count } as Result<number>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<number>;
    }
  }

  async update(id: string, changes: Partial<T & DB.MetaData>): AsyncResult<T & DB.MetaData> {
    if (!Object.keys(changes).length) throw new Error("[Table] No changes provided");

    const doc = await this.collection.findOne(id).exec();
    if (!doc) throw new Error(`[Table] Cannot update: document with id "${id}" not found`);

    try {
      const updated = await doc.incrementalPatch({
        ...changes,
        updated_at: new Date().toISOString(),
        version: (doc.toJSON() as T & DB.MetaData).version + 1,
      } as Partial<T & DB.MetaData>);
      const category = updated.toJSON() as T & DB.MetaData;

      return { ok: true, value: category } as Result<T & DB.MetaData>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T & DB.MetaData>;
    }
  }

  async updateMany(updates: { id: string; changes: Partial<T & DB.MetaData> }[]): AsyncResult {
    if (!updates.length) return { ok: true, value: [] } as Result<T[]>;

    const results = await Promise.all(updates.map(({ id, changes }) => this.update(id, changes)));
    const ok = results.every((result) => result.ok);
    if (!ok) return { ok: false, error: "One or more updates failed" } as Result<T[]>;

    return { ok: true };
  }

  async archive(id: string): AsyncResult<T & DB.MetaData> {
    return this.update(id, { archived: true } as Partial<T & DB.MetaData>);
  }

  async remove(id: string): AsyncResult {
    const doc = await this.collection.findOne(id).exec();
    if (!doc) return { ok: false, error: `[Table] Cannot remove: document with id "${id}" not found` } as Result;

    try {
      await doc.remove();
      return { ok: true } as Result;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: `[Table] Failed to remove document "${id}": ${message}` } as Result;
    }
  }

  async removeMany(ids: string[]): AsyncResult {
    if (!ids.length) return { ok: true } as Result;

    try {
      await this.collection.bulkRemove(ids);
      return { ok: true } as Result;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result;
    }
  }

  subscribe$(query?: MangoQuery<T & DB.MetaData>): Observable<(T & DB.MetaData)[]> {
    return this.collection.find(query).$.pipe(map((docs) => docs.map((doc) => doc.toJSON() as T & DB.MetaData)));
  }

  subscribeOne$(id: string): Observable<(T & DB.MetaData) | null> {
    return this.collection.findOne(id).$.pipe(map((doc) => (doc ? (doc.toJSON() as T & DB.MetaData) : null)));
  }
}
