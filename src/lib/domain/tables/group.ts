import Table from "./sync-table";

export class GroupTable extends Table<Domain.Group> {
  async create(item: Domain.Group): AsyncResult<DB.Group> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Group>): AsyncResult<DB.Group> {
    return super.update(id, changes);
  }
}
