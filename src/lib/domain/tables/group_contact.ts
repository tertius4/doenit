import Table from "./sync-table";

export class GroupContactTable extends Table<Domain.GroupContact> {
  async create(item: Domain.GroupContact): AsyncResult<DB.GroupContact> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.GroupContact>): AsyncResult<DB.GroupContact> {
    return super.update(id, changes);
  }
}
