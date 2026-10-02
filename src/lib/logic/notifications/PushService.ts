/**
 * Remote push (FCM) lifecycle. The Cloud Function delivers pushes for every inbox notification
 * to the tokens stored in users/{uid}/push_tokens/{device_id}.
 *
 * The token is kept on the user's own `user_state`, so one user's token can never be used for another.
 * Everything here is best-effort and a no-op on the web.
 */

import { Device } from "@capacitor/device";
import DB from "$domain/db";
import firestore from "$services/firestore";
import { PushAdapter, type PushPayload } from "$services/notifications/PushAdapter";
import { context } from "$logic/context.svelte";
import { NotificationService } from "$logic/notifications/NotificationService";
import { NotificationRouter } from "$logic/notifications/NotificationRouter";

function isEnabled(): boolean {
  // Opt-out: on unless the user turned it off.
  return context._settings?.push_notifications_enabled !== false;
}

async function deviceId(): Promise<string | null> {
  try {
    return (await Device.getId()).identifier || null;
  } catch {
    return null;
  }
}

/** An empty token means "none" (a patch cannot remove a field). */
async function saveLocally(user_id: string, token: string) {
  const state = await DB.user_state.get(user_id);
  if (!state.ok) return;
  if ((state.value.fcm_token ?? "") === token) return;

  await DB.user_state.upsert({
    id: user_id,
    user_id,
    active_scopes: state.value.active_scopes,
    fcm_token: token,
    fcm_token_updated_at: new Date().toISOString(),
  });
}

export const PushService = {
  /**
   * Registers this device for the signed-in user: stores the token locally and remotely.
   * Pass `prompt` to show the OS permission dialog (sign-in, turning push on); otherwise only
   * an already granted permission is used.
   */
  async register(options: { prompt?: boolean } = {}): Promise<boolean> {
    try {
      const user = context.user;
      if (!PushAdapter.isSupported() || !user?.firebase_uid || !isEnabled()) return false;

      const granted = options.prompt ? await PushAdapter.requestPermission() : await PushAdapter.hasPermission();
      if (!granted) return false;

      const [token, device_id] = await Promise.all([PushAdapter.getToken(), deviceId()]);
      if (!token || !device_id) return false;

      await saveLocally(user.id, token);
      await firestore.savePushToken(user.firebase_uid, device_id, token, context._settings?.language ?? "af");
      return true;
    } catch (error) {
      console.warn("[push] failed to register:", error);
      return false;
    }
  },

  /**
   * Stops pushes for the signed-in user on this device. Must run while still signed in
   * (before sign-out), because the rules only let the owner delete the token.
   */
  async unregister(): Promise<void> {
    try {
      const user = context.user;
      if (!PushAdapter.isSupported() || !user?.firebase_uid) return;

      const device_id = await deviceId();
      if (device_id) await firestore.deletePushToken(user.firebase_uid, device_id);
      await saveLocally(user.id, "");
      await PushAdapter.deleteToken();
    } catch (error) {
      console.warn("[push] failed to unregister:", error);
    }
  },

  /** Registers or unregisters to match the user's push setting. Runs on app open, sign-in and setting changes. */
  async sync(): Promise<void> {
    if (!context.user?.firebase_uid) return;
    if (isEnabled()) await this.register();
    else await this.unregister();
  },

  /** Wires token refresh, foreground pushes and taps. Returns an unsubscribe function. */
  async listen(): Promise<() => void> {
    const unsubscribers = await Promise.all([
      PushAdapter.onTokenRefresh(() => void this.register()),
      PushAdapter.onReceived(() => void NotificationService.pull()),
      PushAdapter.onTap((payload) => void openFromPush(payload)),
    ]);
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  },
};

/** Opens the screen for a tapped push, after refreshing the inbox so the new notification is there. */
async function openFromPush(payload: PushPayload) {
  await NotificationService.pull().catch((error) => console.warn("[push] pull failed:", error));

  const { type, notification_id, ...data } = payload;
  if (!type) return;

  const notification = notification_id ? await DB.notification.findById(notification_id) : null;
  if (notification?.ok && notification.value) {
    await NotificationRouter.open(notification.value);
    return;
  }

  await NotificationRouter.open({ type: type as DB.NotificationType, data });
}
