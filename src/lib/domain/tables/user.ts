import Table from "./base-table";

export class UserTable extends Table<Domain.User> {
  async create(item: Domain.User): AsyncResult<DB.User> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.User>): AsyncResult<DB.User> {
    return super.update(id, changes);
  }
}
