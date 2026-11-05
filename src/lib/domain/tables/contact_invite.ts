import Table from "./local-table";

export class ContactInviteTable extends Table<DB.ContactInvite> {
  /** A relationship can have many invites over time (rejected, cancelled, accepted...). */
  findAllByRelationshipId(relationship_id: string): AsyncResult<DB.ContactInvite[]> {
    return this.findMany({ where: { relationship_id } });
  }

  findByRelationshipId(relationship_id: string): AsyncResult<DB.ContactInvite | null> {
    return this.findOne({ where: { relationship_id } });
  }
}
