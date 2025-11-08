/*
 * README: Notifications.
 * This file handles the admin of showing notifications, but no app specific logic should be here.
 */
import { getMessaging, onMessage, type Messaging } from "firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { initializeApp } from "$lib/chunk/firebase-app";
import { APP_NAME, FIREBASE_CONFIG } from "$lib";
import { Alert } from "$lib/core/alert";
import { PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import user from "$lib/core/user.svelte";
import { OnlineDB } from "$lib/OnlineDB";

// Local Notification configuration
const localConfig = {
  channelId: "default-channel",
  channelName: "Default Channel",
  defaultTitle: "App Notification",
  defaultBody: "You have a new notification",
};

export class Notify {
  static Local = class {
    static is_initialized = false;

    static async initialize() {
      try {
        await LocalNotifications.createChannel({
          id: localConfig.channelId,
          name: localConfig.channelName,
          importance: 3,
          visibility: 1,
        });
        this.is_initialized = true;
      } catch (error) {
        alert(`Local Notification initialization failed: ${error.message}`);
      }
    }

    static async send({ id = 1, title = localConfig.defaultTitle, body = localConfig.defaultBody }) {
      if (!this.is_initialized) await this.initialize();
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
        return { status: "success" };
      } catch (error) {
        alert(`Local Notification send failed: ${error.message}`);
        return { status: "failed", error: error.message };
      }
    }

    static async schedule({ id = 1, title = localConfig.defaultTitle, body = localConfig.defaultBody, at }) {
      if (!this.is_initialized) await this.initialize();
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              schedule: { at: new Date(at) },
            },
          ],
        });
        return { status: "success" };
      } catch (error) {
        alert(`Local Notification schedule failed: ${error.message}`);
        return { status: "failed", error: error.message };
      }
    }
  };

  static Push = class {
    static is_initialized: boolean = false;
    static messaging: Messaging | null = null;

    static async initialize() {
      try {
        const app = initializeApp(FIREBASE_CONFIG, APP_NAME);
        Notify.Push.messaging = getMessaging(app);
        Notify.Push.is_initialized = true;
        onMessage(Notify.Push.messaging, (payload) => {
          Alert.success(`[WERK HIERDIE OOIT?] Push Notification received: ${payload.notification?.body}`);
        });
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        Alert.error(`Kon nie Push Notification initaliseer nie: ${error_message}`);
      }
    }

    /**
     * To send a push notification to a specific user/device,
     * you need their FCM device token.
     * This method only retrieves the token for the current device.
     * Actual sending is done server-side using the recipient's token.
     */
    static async send({ title, body, email_address }: { title: string; body: string; email_address: string[] }) {
      if (!email_address.length) return;

      if (!Notify.Push.is_initialized) {
        await this.initialize();
      }

      try {
        if (!user.value) throw new Error("User not authenticated");

        const token = await user.value.id_token;

        const users = await OnlineDB.User.getAll({
          filters: [{ field: "email_address", operator: "in", value: email_address }],
        });

        const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/sendPushNotification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token: users[0].fcm_token, title, body }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send push notification");
        }
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        Alert.error(`Stuur van Push Notification het gefaal: ${error_message}`);
      }
    }

    static async sendTemplate({ type, data, email_address }: { type: string; data: Record<string, any>; email_address: string[] }) {
      if (!email_address.length) return;

      if (!Notify.Push.is_initialized) {
        await this.initialize();
      }

      try {
        if (!user.value) throw new Error("User not authenticated");

        const token = await user.value.id_token;

        const users = await OnlineDB.User.getAll({
          filters: [{ field: "email_address", operator: "in", value: email_address }],
        });

        const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/sendPushNotification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token: users[0].fcm_token, type, data }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send push notification template");
        }
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        Alert.error(`Stuur van Push Notification Template het gefaal: ${error_message}`);
      }
    }
  };
}
