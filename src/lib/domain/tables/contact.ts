import { context } from "$logic/context.svelte";
import Table from "./local-table";

export class ContactTable extends Table<Domain.Contact> {
  async create(item: Domain.Contact): AsyncResult<DB.Contact> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Contact>): AsyncResult<DB.Contact> {
    return super.update(id, changes) as AsyncResult<DB.Contact>;
  }

  async findByRelationshipId(relationship_id: string): AsyncResult<DB.Contact | null> {
    return super.findOne({ selector: { relationship_id, owner_id: context.user?.id } });
  }
}
