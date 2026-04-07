import type { MangoQuery, RxCollection } from "$lib/logic/chunk/rxdb";
import { map, type Observable } from "rxjs";

export default class BaseTable<T> {
  collection: RxCollection<T>;

  constructor(collection: RxCollection<T>) {
    this.collection = collection;
  }

  async create(item: T): AsyncResult<T> {
    try {
      if (!item) throw new Error("[Table] Item is required");

      const result = await this.collection.insert(item as T);
      const new_item = result.toJSON() as T;

      return { ok: true, value: new_item } as Result<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T>;
    }
  }

  async createMany(items: T[]): AsyncResult<T[]> {
    if (!items.length) return { ok: true, value: [] } as Result<T[]>;

    try {
      const result = await this.collection.bulkInsert(items as T[]);
      const value = result.success.map((doc) => doc.toJSON() as T);
      return { ok: true, value } as Result<T[]>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<T[]>;
    }
  }

  async findById(id: string): AsyncResult<T | null> {
    try {
      const doc = await this.collection.findOne(id).exec();
      const value = doc ? (doc.toJSON() as T) : null;
      return { ok: true, value } as Result<T | null>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T | null>;
    }
  }

  async findOne(query: MangoQuery<T>): AsyncResult<T | null> {
    try {
      const doc = await this.collection.findOne(query).exec();
      const value = doc ? (doc.toJSON() as T) : null;
      return { ok: true, value } as Result<T | null>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T | null>;
    }
  }

  async findMany(query?: MangoQuery<T>): AsyncResult<T[]> {
    try {
      const docs = await this.collection.find(query).exec();
      const values = docs.map((doc) => doc.toJSON() as T);
      return { ok: true, value: values } as Result<T[]>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<T[]>;
    }
  }

  async count(query?: MangoQuery<T>): AsyncResult<number> {
    try {
      const count = await this.collection.count(query).exec();
      return { ok: true, value: count } as Result<number>;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result<number>;
    }
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T> {
    try {
      if (!Object.keys(changes).length) throw new Error("[Table] No changes provided");

      const doc = await this.collection.findOne(id).exec();
      if (!doc) throw new Error(`[Table] Cannot update: document with id "${id}" not found`);

      const updated = await doc.incrementalPatch(changes);
      const updated_item = updated.toJSON() as T;

      return { ok: true, value: updated_item } as Result<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<T>;
    }
  }

  async updateMany(updates: { id: string; changes: Partial<T> }[]): AsyncResult {
    if (!updates.length) return { ok: true, value: [] } as Result<T[]>;

    const results = await Promise.all(updates.map(({ id, changes }) => this.update(id, changes)));
    const ok = results.every((result) => result.ok);
    if (!ok) return { ok: false, error: "One or more updates failed" };

    return { ok: true };
  }

  async remove(id: string): AsyncResult {
    const doc = await this.collection.findOne(id).exec();
    if (!doc) return { ok: false, error: `[Table] Cannot remove: document with id "${id}" not found` };

    try {
      await doc.remove();
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: `[Table] Failed to remove document "${id}": ${message}` };
    }
  }

  async removeMany(ids: string[]): AsyncResult {
    if (!ids.length) return { ok: true };

    try {
      await this.collection.bulkRemove(ids);
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return { ok: false, error: message } as Result;
    }
  }

  subscribe$(query?: MangoQuery<T>): Observable<T[]> {
    return this.collection.find(query).$.pipe(map((docs) => docs.map((doc) => doc.toJSON() as T)));
  }

  subscribeOne$(id: string): Observable<T | null> {
    return this.collection.findOne(id).$.pipe(map((doc) => (doc ? (doc.toJSON() as T) : null)));
  }
}
