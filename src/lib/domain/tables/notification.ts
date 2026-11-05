import type { TableQuery } from "./base-table";
import Table from "./local-table";

export class NotificationTable extends Table<DB.Notification> {
  unreadQuery(user_id: string): TableQuery {
    return { where: { user_id, read_at: null } };
  }

  unreadCount(user_id: string): AsyncResult<number> {
    return this.count(this.unreadQuery(user_id));
  }
}
