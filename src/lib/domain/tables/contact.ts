import Table from "./sync-table";

export class ContactTable extends Table<Domain.Contact> {
  async create(item: Domain.Contact): AsyncResult<DB.Contact> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Contact>): AsyncResult<DB.Contact> {
    return super.update(id, changes);
  }
}
