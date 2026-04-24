import Table from "./local-table";

export class SettingsTable extends Table<Domain.Settings> {
  async create(item: Domain.Settings & Partial<DB.MetaDataPrivate>): AsyncResult<DB.Settings> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Settings>): AsyncResult<DB.Settings> {
    return super.update(id, changes);
  }

  async getSettings(user_id?: string): AsyncResult<DB.Settings> {
    try {
      if (user_id) {
        const user_settings = await this.collection.findOne(user_id).exec();
        if (user_settings) {
          return { ok: true, value: user_settings.toJSON() } as Result<DB.Settings>;
        }

        // Copy settings from device.
        const device_settings = await this.collection.findOne("device").exec();
        if (device_settings) {
          const created = await this.collection.insert({
            ...device_settings.toJSON(),
            id: user_id,
            user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          return { ok: true, value: created.toJSON() } as Result<DB.Settings>;
        }

        return {
          ok: false,
          error: `No settings found for user_id "${user_id}" and failed to copy from device settings`,
        } as Result<DB.Settings>;
      } else {
        const existing = await this.collection.findOne(user_id || "device").exec();
        if (existing) {
          return { ok: true, value: existing.toJSON() } as Result<DB.Settings>;
        }

        const date = new Date().toISOString();
        const created = await this.collection.insert({
          id: "device",
          owner_id: "device",
          user_id: "device",

          theme: "dark",
          automatic_backup: false,

          notifications_enabled: true,
          present_task_reminder_enabled: true,
          present_task_reminder_time: "09:00",
          past_task_reminder_enabled: false,
          past_task_reminder_time: null,
          text_size: "md",

          created_at: date,
          updated_at: date,
        });

        return { ok: true, value: created.toJSON() } as Result<DB.Settings>;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message } as Result<DB.Settings>;
    }
  }
}
