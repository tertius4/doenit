import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

/** Remote (FCM) push notifications. Native only: every call is a no-op on the web. */
export type PushPayload = { type?: string; notification_id?: string; [key: string]: string | undefined };

export const PushAdapter = {
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  },

  async hasPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const status = await FirebaseMessaging.checkPermissions();
    return status.receive === "granted";
  },

  /** Shows the OS prompt if the user has not decided yet. */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const status = await FirebaseMessaging.requestPermissions();
    return status.receive === "granted";
  },

  async getToken(): Promise<string | null> {
    if (!this.isSupported()) return null;
    const { token } = await FirebaseMessaging.getToken();
    return token || null;
  },

  /** Invalidates this device's token, so a later sign-in gets a fresh one. */
  async deleteToken(): Promise<void> {
    if (!this.isSupported()) return;
    await FirebaseMessaging.deleteToken();
  },

  /** Calls back when FCM rotates the token. Returns an unsubscribe function. */
  async onTokenRefresh(callback: (token: string) => void): Promise<() => void> {
    if (!this.isSupported()) return () => {};
    const handle = await FirebaseMessaging.addListener("tokenReceived", (event) => callback(event.token));
    return () => {
      handle.remove();
    };
  },

  /** Calls back when a push arrives while the app is open. Returns an unsubscribe function. */
  async onReceived(callback: (payload: PushPayload) => void): Promise<() => void> {
    if (!this.isSupported()) return () => {};
    const handle = await FirebaseMessaging.addListener("notificationReceived", (event) => {
      callback((event.notification.data ?? {}) as PushPayload);
    });
    return () => {
      handle.remove();
    };
  },

  /** Calls back with the data of a tapped push. Returns an unsubscribe function. */
  async onTap(callback: (payload: PushPayload) => void): Promise<() => void> {
    if (!this.isSupported()) return () => {};
    const handle = await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
      callback((event.notification.data ?? {}) as PushPayload);
    });
    return () => {
      handle.remove();
    };
  },
};
