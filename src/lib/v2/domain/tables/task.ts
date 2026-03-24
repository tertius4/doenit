import t from "$display/translate";
import Table from "./base-table";

export class TaskTable extends Table<Domain.Task> {
  async create(item: Domain.Task): AsyncResult<DB.Task> {
    item.name = item.name?.trim() || "";
    if (!item.name) return { ok: false, error: t("what_must_be_done") };

    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Task>): AsyncResult<DB.Task> {
    return super.update(id, changes);
  }
}
