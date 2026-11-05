import { context } from "$logic/context.svelte";
import Table from "./local-table";

export class ContactTable extends Table<DB.Contact> {
  findByRelationshipId(relationship_id: string): AsyncResult<DB.Contact | null> {
    return this.findOne({ where: { relationship_id, user_id: context.user?.id ?? null } });
  }
}
