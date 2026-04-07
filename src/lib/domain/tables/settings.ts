import Table from "./base-table";

export class SettingsTable extends Table<Domain.Settings> {
  async create(item: Domain.Settings): AsyncResult<DB.Settings> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Settings>): AsyncResult<DB.Settings> {
    return super.update(id, changes);
  }

  async getDevice(): AsyncResult<Domain.Settings> {
    try {
      const existing = await this.collection.findOne("device").exec();

      if (existing) {
        return { ok: true, value: existing.toJSON() as Domain.Settings };
      }

      const created = await this.collection.insert({
        id: "device",
        user_id: "device",

        theme: "dark",
        language: "af",

        notifications_enabled: true,
        reminder_time: "08:00",
        reminders_enabled: true,
        text_size: "md",

        archived: false,
        soft_deleted: false,
        dirty: false,
        version: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return { ok: true, value: created.toJSON() as Domain.Settings };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }
}
