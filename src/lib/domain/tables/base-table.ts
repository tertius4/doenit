import type { Live } from "@tertius4/sinkro-db";

export type TableQuery = {
  where?: Record<string, any>;
  sort?: string[];
  limit?: number;
  skip?: number;
  includeDeleted?: boolean;
  filter?: (doc: any) => boolean;
};

/** Runs a package call, which throws, and answers with a Result. */
export async function attempt<T>(work: () => Promise<T>): Promise<any> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/** A table of the package, with Result answers. Other code passes whole documents, so only known fields go through. */
export default class BaseTable<T extends { id: string; created_at?: string; updated_at?: string }> {
  readonly table: any;

  constructor(table: any) {
    this.table = table;
  }

  protected fields(doc: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(doc).filter(([key]) => key in this.table.def.fields));
  }

  private insertable(item: Record<string, any>): Record<string, any> {
    return item.id ? { ...this.fields(item), id: item.id } : this.fields(item);
  }

  create(item: Partial<T> | Record<string, any>): AsyncResult<T> {
    return attempt(() => this.table.insert(this.insertable(item)));
  }

  createMany(items: (Partial<T> | Record<string, any>)[]): AsyncResult<T[]> {
    return attempt(() => this.table.insertMany(items.map((item) => this.insertable(item))));
  }

  /** Brings in documents with their own times, such as from a backup or from Firestore. */
  importMany(docs: T[], options?: { pending?: boolean }): AsyncResult<number> {
    const complete = docs.map((doc) => ({
      ...this.fields(doc),
      id: doc.id,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));
    return attempt(() => this.table.import(complete, options));
  }

  findById(id: string, options?: { includeDeleted?: boolean }): AsyncResult<T | null> {
    return attempt(async () => (await this.table.get(id, options)) ?? null);
  }

  findOne(query: TableQuery): AsyncResult<T | null> {
    return attempt(async () => (await this.table.findOne(query)) ?? null);
  }

  findMany(query?: TableQuery): AsyncResult<T[]> {
    return attempt(() => this.table.find(query));
  }

  count(query?: TableQuery): AsyncResult<number> {
    return attempt(() => this.table.count(query));
  }

  async update(id: string, changes: Partial<T> | Record<string, any>): AsyncResult<T> {
    const known = this.fields(changes);
    if (!Object.keys(known).length) return { ok: false, error: "[Table] No changes provided" } as Result<T>;

    return attempt(() => this.table.update(id, known));
  }

  async updateMany(updates: { id: string; changes: Partial<T> | Record<string, any> }[]): AsyncResult<T[]> {
    const values: T[] = [];
    for (const { id, changes } of updates) {
      const result = await this.update(id, changes);
      if (!result.ok) return { ok: false, error: "One or more updates failed" } as Result<T[]>;
      values.push(result.value as T);
    }

    return { ok: true, value: values } as Result<T[]>;
  }

  remove(id: string): AsyncResult {
    return attempt(() => this.table.remove(id)).then(({ ok, error }) => (ok ? { ok } : { ok, error }));
  }

  async removeMany(ids: string[]): AsyncResult {
    for (const id of new Set(ids)) {
      const result = await this.remove(id);
      if (!result.ok) return result;
    }

    return { ok: true };
  }

  live(query?: TableQuery): Live<T[]> {
    return this.table.live(query);
  }

  liveOne(id: string): Live<T | undefined> {
    return this.table.liveOne(id);
  }
}
