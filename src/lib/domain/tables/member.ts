import Table from "./sync-table";

export class MemberTable extends Table<Domain.Member> {
  async create(item: Domain.Member): AsyncResult<DB.Member> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Member>): AsyncResult<DB.Member> {
    return super.update(id, changes);
  }
}
