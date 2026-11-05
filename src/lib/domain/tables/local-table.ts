import BaseTable from "./base-table";

export default class LocalTable<T extends { id: string; created_at?: string; updated_at?: string }> extends BaseTable<T> {
  /** Stores a copy from Firestore with its own times. An older or equally old copy leaves the stored one as it is. */
  async upsert(doc: T): AsyncResult<T> {
    const result = (await this.importMany([doc])) as Result<number>;
    if (!result.ok) return { ok: false, error: result.error } as Result<T>;

    return { ok: true, value: doc } as Result<T>;
  }
}
