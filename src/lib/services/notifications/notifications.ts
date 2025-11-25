/*
 * README: Notifications.
 * This file handles the admin of showing notifications, but no app specific logic should be here.
 */
import { getMessaging, type Messaging } from "firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { initializeApp } from "$lib/chunk/firebase-app";
import { APP_NAME, FIREBASE_CONFIG } from "$lib";
import { Alert } from "$lib/core/alert";
import { PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { user } from "$lib/base/user.svelte";
import { OnlineDB } from "$lib/OnlineDB";

// TODO: Candidate for core or base
// TODO: Refactor notifications

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
        const error_message = error instanceof Error ? error.message : String(error);
        alert(`Kon nie plaaslike kennisgewing inisialiseer nie: ${error_message}`);
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
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        alert(`Kon nie plaaslike kennisgewing stuur nie: ${error_message}`);
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
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        alert(`Kon nie plaaslike kennisgewing skeduleer nie: ${error_message}`);
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
        const token = user.getToken ? await user.getToken() : null;
        if (!token) throw new Error("User not authenticated");

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

    static async sendTemplate({
      type,
      data,
      email_address,
    }: {
      type: string;
      data: Record<string, any>;
      email_address: string[];
    }) {
      if (!email_address.length) return;

      if (!Notify.Push.is_initialized) {
        await this.initialize();
      }

      try {
        const token = user.getToken ? await user.getToken() : null;
        if (!token) throw new Error("User not authenticated");

        const users = await OnlineDB.User.getAll({
          filters: [{ field: "email_address", operator: "in", value: email_address }],
        });
        const usersWithTokens = users.filter((user) => user.fcm_token);
        if (!usersWithTokens.length) return;

        const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/sendPushNotification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            users: usersWithTokens.map((u) => ({
              fcm_token: u.fcm_token,
              language_code: u.language_code || "af",
              email_address: u.email_address,
            })),
            type,
            data,
          }),
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
