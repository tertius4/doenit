import Table from "./local-table";

export class SettingsTable extends Table<DB.Settings> {
  async getSettings(user_id?: string): AsyncResult<DB.Settings> {
    const existing = await this.findById(user_id || "device");
    if (!existing.ok) return existing;
    if (existing.value) return { ok: true, value: existing.value };

    if (!user_id) {
      return this.create({
        id: "device",
        owner_id: "device",
        user_id: "device",

        theme: "dark",
        automatic_backup: false,

        notifications_enabled: true,
        present_task_reminder_enabled: true,
        present_task_reminder_time: "09:00",
        past_task_reminder_enabled: false,
        past_task_reminder_time: "09:00",
        text_size: "md",
      });
    }

    // Copy settings from device.
    const device_settings = await this.findById("device");
    if (!device_settings.ok) return device_settings;
    if (!device_settings.value) {
      return { ok: false, error: `No settings found for user_id "${user_id}" and failed to copy from device settings` };
    }

    return this.create({ ...device_settings.value, id: user_id, user_id });
  }
}
