import { apiLogger } from "$lib";
import { NotificationService } from "$domain/notifications/NotificationService";

export const pull = () => NotificationService.pull();
export const markAsRead = apiLogger(markAsReadHandler);

async function markAsReadHandler(notification: DB.Notification): AsyncResult<DB.Notification> {
  return NotificationService.markAsRead(notification);
}
