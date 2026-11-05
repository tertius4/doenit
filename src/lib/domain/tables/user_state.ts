import Table from "./local-table";

function defaults(open_count: number) {
  const now = new Date().toISOString();
  return {
    active_scopes: [],
    sync_cursors: {},
    last_opened_at: now,
    open_count,
    last_rate_prompt_at: now,
    last_backed_up: now,
    rate_prompt_count: 0,
    has_rated: false,
  };
}

export class UserStateTable extends Table<DB.UserState> {
  async get(id: string): AsyncResult<DB.UserState> {
    const existing = await this.findById(id);
    if (!existing.ok) return existing;
    if (existing.value) return { ok: true, value: existing.value };

    return this.create({ ...defaults(1), id, user_id: id });
  }

  async upsert(data: Pick<DB.UserState, "id" | "user_id" | "active_scopes"> & Partial<DB.UserState>): AsyncResult<DB.UserState> {
    const existing = await this.findById(data.id);
    if (!existing.ok) return existing;

    return existing.value ? this.update(data.id, data) : this.create({ ...defaults(0), ...data });
  }
}
