import type { RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";

export class ContactInviteTable extends BaseTable<DB.ContactInvite> {
  constructor(collection: RxCollection<DB.ContactInvite>) {
    super(collection);
  }

  async upsert(invite: DB.ContactInvite): AsyncResult<DB.ContactInvite> {
    try {
      const doc = await this.collection.upsert(invite);
      return { ok: true, value: doc.toJSON() as DB.ContactInvite };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  async findByRelationshipId(relationship_id: string): AsyncResult<DB.ContactInvite | null> {
    return this.findOne({ selector: { relationship_id } });
  }
}
