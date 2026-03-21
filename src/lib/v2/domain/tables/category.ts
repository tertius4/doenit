import Table from "./base-table";

export class CategoryTable extends Table<Domain.Category> {
  async create(item: Domain.Category): AsyncResult<DB.Category> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Category>): AsyncResult<DB.Category> {
    return super.update(id, changes);
  }
}
