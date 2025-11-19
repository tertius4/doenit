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
      await this.syncUserData(this.token);

      // Listen for incoming messages
      this.setupMessageListener();

      // Handle notification that launched the app (from killed state)
      this.handleAppLaunchNotification();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("error_initializing_push_notifications")}: ${error_message}`);
    }
  }

  private async syncUserData(token: string) {
    if (!user.value) return;

    const [online_user] = await OnlineDB.User.getAll({
      filters: [{ field: "email_address", operator: "==", value: user.value.email }],
      limit: 1,
    });

    if (online_user) {
      let is_updated = false;

      // Kyk vir enige veranderinge - Hierdie is al gebruiks inligting wat gestoor word.
      if (!is_updated && online_user.avatar !== user.value.avatar) is_updated = true;
      if (!is_updated && online_user.name !== user.value.name) is_updated = true;
      if (!is_updated && online_user.email_address !== user.value.email) is_updated = true;
      if (!is_updated && online_user.fcm_token !== token) is_updated = true;
      if (!is_updated && online_user.language_code !== (Cached.language.value || "af")) is_updated = true;

      if (!is_updated) return;
      await OnlineDB.User.updateById(online_user.id, {
        fcm_token: token,
        avatar: user.value.avatar,
        name: user.value.name,
        email_address: user.value.email,
        language_code: Cached.language.value || "af",
      });
    } else {
      await OnlineDB.User.create({
        fcm_token: token,
        avatar: user.value.avatar,
        name: user.value.name,
        email_address: user.value.email,
        language_code: Cached.language.value || "af",
      });
    }
  }

  private async handleAppLaunchNotification() {
    try {
      // Check if app was launched by tapping a notification
      const result = await FirebaseMessaging.getDeliveredNotifications();
      // Note: This method may not be available in all versions
      // The notificationActionPerformed listener should handle most cases
    } catch (error) {
      // Method not available or other error - this is expected in some versions
      console.log("getDeliveredNotifications not available or error:", error);
    }
  }

  private setupMessageListener() {
    // Listen for messages when app is in foreground
    FirebaseMessaging.addListener("notificationReceived", async (action) => {
      console.log("Foreground notification received:", action);
      await this.processNotification(action);
    });

    // Listen for notification taps (when app is in background)
    FirebaseMessaging.addListener("notificationActionPerformed", async (action) => {
      console.log("Notification tap performed:", action);
      await this.processNotification(action);
    });

    // Listen for token refresh
    FirebaseMessaging.addListener("tokenReceived", async (event) => {
      console.log("FCM token received:", event.token);
      this.token = event.token;
      await this.syncUserData(event.token);
    });
  }

  private async processNotification(action: any) {
    try {
      // Debug: Log the entire action object to see what we're receiving
      console.log("Full action object:", JSON.stringify(action, null, 2));

      // Try to get data from the FCM data payload first (new format)
      let notificationData = null;
      let notificationType = null;

      // Check for data in various possible locations
      // For Capacitor Firebase Messaging, the data payload is often in different locations
      if (action.data) {
        console.log("Found data in action.data:", action.data);
        notificationData = action.data;
        notificationType = action.data.type;
      } else if (action.notification?.data) {
        console.log("Found data in action.notification.data:", action.notification.data);
        notificationData = action.notification.data;
        notificationType = action.notification.data.type;
      } else if ((action as any).message?.data) {
        console.log("Found data in action.message.data:", (action as any).message.data);
        notificationData = (action as any).message.data;
        notificationType = (action as any).message.data.type;
      } else if (action.notification?.body) {
        console.log("Trying to parse body as JSON:", action.notification.body);
        // Fallback to legacy JSON body format
        try {
          const parsed = JSON.parse(action.notification.body);
          notificationType = parsed.type;
          notificationData = parsed.data;
          console.log("Successfully parsed JSON from body:", { type: notificationType, data: notificationData });
        } catch (e) {
          console.log("Body is not JSON, treating as regular notification");
          // Not JSON, handle as regular notification
          return;
        }
      } else {
        console.log("No data found in any expected location");
        return;
      }

      if (notificationType && notificationData) {
        console.log("Processing notification with type:", notificationType, "data:", notificationData);
        await this.handleDataNotification({ type: notificationType, ...notificationData });
      } else {
        console.log("Missing type or data:", { type: notificationType, data: notificationData });
      }
    } catch (error) {
      console.error("Error processing notification:", error);
    }
  }

  private async handleDataNotification(data: Record<string, string>) {
    try {
      const { type, ...notificationData } = data;
      if (!type) return;

      const body = await this.getBody(type, notificationData);
      if (!body) return;

      const formatted_notification = {
        id: Date.now() % 1000000,
        title: this.getTitle(type),
        body: body,
        schedule: { at: new Date(Date.now() + 1000) },
      };

      // Show local notification with formatted content
      await LocalNotifications.schedule({ notifications: [formatted_notification] });
    } catch (error) {
      Alert.error(`${t("error_showing_invite_notification")}: ${error}`);
    }
  }

  private async handleInviteNotification(notification: any) {
    try {
      // Legacy format - parse JSON from body
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
          const category = data.category_id ? await DB.Category.get(data.category_id) : null;
          if (!category) return "";

          if (is_english) {
            return `New task "${data.task_name}" assigned in ${category.name}`;
          } else {
            return `Nuwe taak "${data.task_name}" toegeken in ${category.name}`;
          }
        }
      case "task_updated":
        if (true) {
          const category = data.category_id ? await DB.Category.get(data.category_id) : null;
          if (!category) return "";
          if (is_english) {
            return `Task "${data.task_name}" updated in ${category.name}`;
          } else {
            return `Taak "${data.task_name}" opgedateer in ${category.name}`;
          }
        }
      case "user_left_group":
        if (true) {
          const category = data.category_id ? await DB.Category.get(data.category_id) : null;
          if (!category) return "";
          if (is_english) {
            return `${data.user_name} left ${category.name}`;
          } else {
            return `${data.user_name} het ${category.name} verlaat`;
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
