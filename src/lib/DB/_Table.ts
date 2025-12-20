import { DateUtil } from "$lib/core/date_util";
import type { MangoQuery, RxCollection } from "$lib/chunk/rxdb";

export class Table<T extends Task | Category | User | DailySummary> {
  collection: RxCollection<T>;

  constructor(collection: RxCollection<T>) {
    this.collection = collection;
  }

  async create(item: Omit<T, "id" | "created_at" | "archived" | "updated_at"> & { id?: string }): Promise<T> {
    if (!item) throw new Error("Item is required");

    const new_item = {
      archived: false,
      created_at: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
      updated_at: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
      id: crypto.randomUUID(),
      ...item,
    } as T;

    try {
      return await this.collection.insert(new_item);
    } catch (error: any) {
      // Handle conflict: if document with this ID already exists
      if (error?.code === "CONFLICT" || error?.status === 409) {
        const existing_doc = await this.collection.findOne(new_item.id).exec();

        if (existing_doc) {
          const existing = existing_doc.toJSON() as T;

          // Compare updated_at timestamps
          if (new_item.updated_at && existing.updated_at && new_item.updated_at > existing.updated_at) {
            // New item is more recent, update the existing document
            const updated = await this.update(new_item.id, new_item);
            if (updated) return updated;
          }

          // Existing document is more recent or same, return it
          return existing;
        }
      }

      // Re-throw if it's a different error
      throw error;
    }
  }

  async createMany(items: Omit<T, "id" | "created_at" | "archived" | "updated_at">[]): Promise<{ success: T[] }> {
    if (!items || !items.length) throw new Error("Items are required");

    const created_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    const updated_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    const new_items = items.map((item) => ({ ...item, created_at, updated_at, id: crypto.randomUUID() }) as T);

    return this.collection.bulkInsert(new_items);
  }

  async getAll(filter: MangoQuery<T> = {}): Promise<T[]> {
    const docs = await this.collection.find(filter).exec();

    return docs.map((d) => d.toJSON() as T);
  }

  async get(id: string): Promise<T> {
    if (typeof id !== "string") throw new Error(`Cannot fetch ${this.collection.name} with id: ${id}`);

    const doc = await this.collection.findOne(id).exec();
    if (!doc) throw new Error(`[DB]: ${this.collection.name} with id ${id} not found`);

    return doc.toJSON() as T;
  }

  async getOne(filter: MangoQuery<T> = {}): Promise<T> {
    const doc = await this.collection.findOne(filter).exec();
    if (!doc) throw new Error(`[DB]: ${this.collection.name} nie gevind`);

    return doc.toJSON() as T;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const doc = await this.collection.findOne(id).exec();
    if (!doc) throw new Error(`${this.collection.name} with id ${id} not found`);

    updates.updated_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");

    const result = await doc.patch(updates);
    return result.toJSON() as T;
  }

  async updateMany(options: { filters: MangoQuery<T>["selector"]; updates: Partial<T> }): Promise<SimpleResult> {
    const { filters, updates } = options;

    updates.updated_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    await this.collection.find({ selector: filters }).update({
      $set: updates,
    });

    return { success: true };
  }

  async delete(ids: (string | T) | (string | T)[]): Promise<void> {
    try {
      if (!Array.isArray(ids)) ids = [ids];
      if (!ids.length) return;
      if (typeof ids[0] !== "string") {
        ids = (ids as T[]).map((i) => i.id);
      }

      await this.collection.find({ selector: { id: { $in: ids } } }).remove();
    } catch (e) {
      alert(`Fout met verwydering van item ${this.collection.name}: ` + e);
    }
  }

  async archive(id: string): Promise<void> {
    const doc = await this.collection.findOne(id).exec();
    if (doc)
      await doc.patch({ archived: true, updated_at: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss") } as Partial<T>);
  }

  async unarchive(id: string): Promise<void> {
    const doc = await this.collection.findOne(id).exec();
    if (doc)
      await doc.patch({
        archived: false,
        updated_at: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
      } as Partial<T>);
  }

  async overwriteMany(items: T[]): Promise<{ success: T[]; error: any[] }> {
    if (!items || !items.length) throw new Error("Items are required");

    return this.collection.bulkUpsert(items);
  }

  /**
   * Remove all data from the collection (use with caution)
   */
  async clear() {
    const docs = await this.collection.find().exec();
    await this.collection.bulkRemove(docs.map(({ id }) => id));
  }

  subscribe(callback: (p0: T[]) => any, filter: MangoQuery<T> = {}) {
    return this.collection.find(filter).$.subscribe((docs) => {
      const jsonDocs = docs.map((d) => d.toJSON() as T);
      callback(jsonDocs);
    });
  }
}
