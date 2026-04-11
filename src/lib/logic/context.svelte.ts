import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import db from "$lib/domain/db";
import { Subscription } from "rxjs";

class ContextClass {
  private _user: DB.User | null = $state(null);
  _settings: DB.Settings | null = $state(null);
  private _permissions: DB.Permissions | null = $state(null);
  private _app_state: DB.AppState | null = $state(null);
  private _user_state: DB.UserState | null = $state(null);

  get user() {
    return this._user;
  }

  set user(value: DB.User | null) {
    this._user = value;
  }

  get settings(): DB.Settings {
    if (!this._settings) throw Error("Settings not loaded");
    return this._settings;
  }

  set settings(value: DB.Settings | null) {
    this._settings = value;
  }

  get permissions(): DB.Permissions {
    if (!this._permissions) throw Error("Permissions not loaded");
    return this._permissions;
  }

  set permissions(value: DB.Permissions | null) {
    this._permissions = value;
  }

  get app_state(): DB.AppState {
    if (!this._app_state) throw Error("App state not loaded");
    return this._app_state;
  }

  set app_state(value: DB.AppState | null) {
    this._app_state = value;
  }

  get user_state(): DB.UserState {
    if (!this._user_state) throw Error("User state not loaded");
    return this._user_state;
  }

  set user_state(value: DB.UserState | null) {
    this._user_state = value;
  }
}

export const context = $state(new ContextClass());

let _user_subscriptions: Subscription | null = null;

function subscribeForUser(user_id: string | null) {
  _user_subscriptions?.unsubscribe();
  _user_subscriptions = new Subscription();

  if (user_id) {
    _user_subscriptions.add(
      db.user.subscribeOne$(user_id).subscribe((user) => {
        context.user = user;
      }),
    );
  } else {
    context.user = null;
  }

  _user_subscriptions.add(
    db.settings.subscribeOne$(user_id || "device").subscribe((settings) => {
      context.settings = settings;
    }),
  );

  _user_subscriptions.add(
    db.permissions.subscribeOne$(user_id || "device").subscribe((permissions) => {
      context.permissions = permissions;
    }),
  );

  _user_subscriptions.add(
    db.user_state.subscribeOne$(user_id || "device").subscribe((user_state) => {
      context.user_state = user_state;
    }),
  );
}

/**
 * Call on app open (no argument) or explicitly after sign-in / sign-out (pass user_id or null).
 * - App open: reads the session, initialises app state, then wires subscriptions.
 * - Sign-in / sign-out: skips app-state init and re-wires subscriptions for the new user.
 */
export async function initApp(user_id?: string | null) {
  const is_app_open = user_id === undefined;

  let resolved_user_id: string | null;
  if (is_app_open) {
    const result = await db.session.get();
    resolved_user_id = (result.ok && result.value.user_id) || null;
  } else {
    resolved_user_id = user_id;
  }

  // Ensure the correct settings document exists before subscribing.
  const settings_result = await db.settings.getSettings(resolved_user_id ?? undefined);
  if (!settings_result.ok) {
    console.error("Failed to load settings:", settings_result.error);
  }

  subscribeForUser(resolved_user_id);

  if (is_app_open) {
    const app_state_result = await db.app_state.getDevice();
    if (!app_state_result.ok) {
      console.error("Failed to get app state:", app_state_result.error);
    } else {
      const now = new Date().toISOString();
      let app_version = app_state_result.value.app_version;
      let device_id = app_state_result.value.device_id;

      try {
        const [app_info, device_info] = await Promise.all([
          App.getInfo().catch(() => ({ version: "unknown" })),
          Device.getId(),
        ]);
        app_version = app_info.version;
        device_id = device_info.identifier;
      } catch {
        // Running in browser / web — skip native APIs
      }

      await db.app_state.update({
        device_id,
        app_version,
        last_opened_at: now,
        open_count: app_state_result.value.open_count + 1,
      });
    }

    db.app_state.subscribeOne$("current").subscribe((app_state: DB.AppState | null) => {
      context.app_state = app_state;
    });
  }
}
