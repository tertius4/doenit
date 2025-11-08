import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Alert } from "$lib/core/alert";
import { OnlineDB } from "$lib/OnlineDB";
import user from "$lib/core/user.svelte";
import { t } from "./language.svelte";
import { Cached } from "$lib/core/cache.svelte";
import { DB } from "$lib/DB";

class PushNotificationService {
  private token: string | null = null;

  async init() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Request permission
      const permission = await FirebaseMessaging.requestPermissions();
      if (permission.receive !== "granted") {
        Alert.error(t("push_notification_permission_not_granted"));
        return;
      }

      // Get FCM token
      const result = await FirebaseMessaging.getToken();
      this.token = result.token;

      // Save token to user profile (you'll need to implement this)
      await this.saveTokenToProfile(this.token);

      // Listen for incoming messages
      this.setupMessageListener();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("error_initializing_push_notifications")}: ${error_message}`);
    }
  }

  private async saveTokenToProfile(token: string) {
    if (!user.value) return;

    const [db_user] = await OnlineDB.User.getAll({
      filters: [{ field: "email_address", operator: "==", value: user.value.email }],
      limit: 1,
    });

    if (db_user) {
      db_user.fcm_token = token;
      await OnlineDB.User.update(db_user.id, db_user);
    } else {
      await OnlineDB.User.create({ email_address: user.value.email, fcm_token: token });
    }
  }

  private setupMessageListener() {
    // Listen for messages when app is in foreground
    FirebaseMessaging.addListener("notificationReceived", (action) => {
      this.handleInviteNotification(action.notification);
    });

    // Listen for notification taps (when app is in background)
    FirebaseMessaging.addListener("notificationActionPerformed", (action) => {
      this.handleInviteNotification(action.notification);
    });
  }

  private async handleInviteNotification(notification) {
    try {
      const { type, data } = JSON.parse(notification.body) || {};
      const body = await this.getBody(type, data);
      if (!body) return;

      const formatted_notification = {
        id: Date.now() % 1000000,
        title: this.getTitle(type),
        body: body,
        schedule: { at: new Date(Date.now() + 1000) },
      };

      // Show local notification with custom actions
      await LocalNotifications.schedule({ notifications: [formatted_notification] });
    } catch (error) {
      Alert.error(`${t("error_showing_invite_notification")}: ${error}`);
    }
  }

  private getTitle(type: string): string {
    const is_english = Cached.language.value === "en";
    switch (type) {
      case "friend_request":
        if (is_english) {
          return "New Friend Request";
        } else {
          return "Nuwe Vriend Versoek";
        }
      case "new_task":
        if (is_english) {
          return "New Task Assigned";
        } else {
          return "Nuwe Taak Toegeken";
        }
      case "task_updated":
        if (is_english) {
          return "Task Updated";
        } else {
          return "Taak Opgedateer";
        }
      case "user_left_group":
        if (is_english) {
          return "User Left Group";
        } else {
          return "Gebruiker Het Groep Verlaat";
        }
      case "friend_request_accepted":
        if (is_english) {
          return "Friend Request Accepted";
        } else {
          return "Vriend Versoek Aanvaar";
        }
      default:
        if (is_english) {
          return "Notification";
        } else {
          return "Kennisgewing";
        }
    }
  }

  private async getBody(type: string, data: any): Promise<string> {
    const is_english = Cached.language.value === "en";

    switch (type) {
      case "friend_request":
        if (is_english) {
          return "You have a new friend request";
        } else {
          return "Jy het 'n nuwe vriend versoek";
        }
      case "new_task":
        if (true) {
          const room = data.room_id ? await DB.Room.get(data.room_id) : null;
          if (!room) return "";

          if (is_english) {
            return `New task "${data.task_name}" assigned in ${room.name}`;
          } else {
            return `Nuwe taak "${data.task_name}" toegeken in ${room.name}`;
          }
        }
      case "task_updated":
        if (true) {
          const room = data.room_id ? await DB.Room.get(data.room_id) : null;
          if (!room) return "";
          if (is_english) {
            return `Task "${data.task_name}" updated in ${room.name}`;
          } else {
            return `Taak "${data.task_name}" opgedateer in ${room.name}`;
          }
        }
      case "user_left_group":
        if (true) {
          const room = data.room_id ? await DB.Room.get(data.room_id) : null;
          if (!room) return "";
          if (is_english) {
            return `${data.user_name} left ${room.name}`;
          } else {
            return `${data.user_name} het ${room.name} verlaat`;
          }
        }
      case "friend_request_accepted":
        if (is_english) {
          return `${data.sender_name} accepted your friend request`;
        } else {
          return `${data.sender_name} het jou vriend versoek aanvaar`;
        }
      default:
        if (is_english) {
          return "You have a new notification";
        } else {
          return "Jy het 'n nuwe kennisgewing";
        }
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

export const pushNotificationService = new PushNotificationService();
