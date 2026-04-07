import Table from "./base-table";

export class PermissionsTable extends Table<Domain.Permissions> {
  async create(item: Domain.Permissions): AsyncResult<DB.Permissions> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Permissions>): AsyncResult<DB.Permissions> {
    return super.update(id, changes);
  }

  async getDevice(): AsyncResult<Domain.Permissions> {
    try {
      const existing = await this.collection.findOne("device").exec();

      if (existing) {
        return { ok: true, value: existing.toJSON() as Domain.Permissions };
      }

      const created = await this.collection.insert({
        id: "device",
        user_id: "device",

        share_tasks: false,
        backup_data: false,

        archived: false,
        soft_deleted: false,
        dirty: false,
        version: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: created.toJSON() as Domain.Permissions };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }
}
