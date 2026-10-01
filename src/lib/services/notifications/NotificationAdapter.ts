import { LocalNotifications } from "@capacitor/local-notifications";

export const NotificationAdapter = {
  async hasPermission(): Promise<boolean> {
    const status = await LocalNotifications.checkPermissions();
    return status.display === "granted";
  },

  /** Shows the OS prompt if the user has not decided yet. */
  async requestPermission(): Promise<boolean> {
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  },

  async schedule(notifications: AL.Notification[] = []) {
    if (!notifications.length) return;

    await LocalNotifications.schedule({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        schedule: { at: notification.at, allowWhileIdle: true },
        extra: notification.extra,
      })),
    });
  },

  async cancelAll() {
    const pending = await LocalNotifications.getPending();

    if (!pending.notifications.length) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({
        id: n.id,
      })),
    });
  },

  /** Calls back with the extra data of a tapped notification. Returns an unsubscribe function. */
  async onTap(callback: (extra: AL.Notification["extra"]) => void): Promise<() => void> {
    const handle = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      callback(action.notification.extra ?? {});
    });

    return () => {
      handle.remove();
    };
  },
};
