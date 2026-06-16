import { LocalNotifications } from "@capacitor/local-notifications";

export class NotificationAdapter {
  static async requestPermissions() {
    await LocalNotifications.requestPermissions();
  }

  static async schedule(notifications: AL.Notification[] = []) {
    if (!notifications.length) return;
    
    await LocalNotifications.schedule({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        schedule: { at: notification.at },
      })),
    });
  }

  static async cancel(id: number) {
    await LocalNotifications.cancel({
      notifications: [{ id }],
    });
  }

  static async cancelAll() {
    const pending = await LocalNotifications.getPending();

    if (!pending.notifications.length) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({
        id: n.id,
      })),
    });
  }

  static async getPending(): Promise<AL.Notification[]> {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      at: new Date(n.schedule?.at ?? 0),
    }));
  }
}
