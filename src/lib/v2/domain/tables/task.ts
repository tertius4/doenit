import Table from "./base-table";

export class TaskTable extends Table<Domain.Task> {
  async create(item: Domain.Task): AsyncResult<DB.Task> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Task>): AsyncResult<DB.Task> {
    return super.update(id, changes);
  }
}
