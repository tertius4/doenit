import { App } from "@capacitor/app";
import BaseTable from "./base-table";

const ID = "current";

export class AppStateTable extends BaseTable<DB.AppState> {
  async getDevice(): AsyncResult<DB.AppState> {
    const existing = await this.findById(ID);
    if (!existing.ok) return existing;
    if (existing.value) return { ok: true, value: existing.value };

    const app_info = await App.getInfo().catch(() => ({ version: "unknown" }));
    return this.create({
      id: ID,
      source_device: crypto.randomUUID(),
      last_opened_at: new Date().toISOString(),
      open_count: 1,
      app_version: app_info.version,
    });
  }

  patch(changes: Partial<DB.AppState>): AsyncResult<DB.AppState> {
    return this.update(ID, changes);
  }
}
