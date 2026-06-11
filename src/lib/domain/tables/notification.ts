import type { MangoQuery, RxCollection } from "$lib/logic/chunk/rxdb";
import BaseTable from "./base-table";

export class NotificationTable extends BaseTable<DB.Notification> {
  constructor(collection: RxCollection<DB.Notification>) {
    super(collection);
  }

  async upsert(notification: DB.Notification): AsyncResult<DB.Notification> {
    try {
      const doc = await this.collection.upsert(notification);
      return { ok: true, value: doc.toJSON() as DB.Notification };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  unreadQuery(user_id: string): MangoQuery<DB.Notification> {
    return {
      selector: {
        user_id,
        read_at: null,
      },
    };
  }

  async unreadCount(user_id: string): AsyncResult<number> {
    return this.count(this.unreadQuery(user_id));
  }

  async markAsRead(id: string, read_at = new Date().toISOString()): AsyncResult<DB.Notification> {
    return this.update(id, { read_at, updated_at: read_at });
  }
}
