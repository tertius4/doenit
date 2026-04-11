import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import db from "$lib/domain/db";

class ContextClass {
  private _user: DB.User | null = $state(null);
  private _settings: DB.Settings | null = $state(null);
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

export async function initApp() {
  const result = await db.session.get();
  const user_id = (result.ok && result.value.user_id) || null;

  if (user_id) {
    db.user.subscribeOne$(user_id).subscribe((user) => {
      context.user = user;
    });
  }

  const settings_result = await db.settings.getDevice();
  if (!settings_result.ok) {
    console.error("Failed to get settings for device:", settings_result.error);
  }
  db.settings.subscribeOne$(user_id || "device").subscribe((settings) => {
    context.settings = settings;
  });

  await db.permissions.getDevice();
  db.permissions.subscribeOne$(user_id || "device").subscribe((permissions) => {
    context.permissions = permissions;
  });

  const app_state_result = await db.app_state.getDevice();
  if (!app_state_result.ok) {
    console.error("Failed to get app state:", app_state_result.error);
  } else {
    const now = new Date().toISOString();
    let app_version = app_state_result.value.app_version;
    let device_id = app_state_result.value.device_id;

    try {
      const [app_info, device_info] = await Promise.all([App.getInfo(), Device.getId()]);
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

  const user_state_result = await db.user_state.getDevice(user_id || "device");
  if (!user_state_result.ok) {
    console.error("Failed to get user state:", user_state_result.error);
  } else if (user_id) {
    await db.user_state.update(user_id, {
      last_opened_at: new Date().toISOString(),
      open_count: user_state_result.value.open_count + 1,
    });
  }
  
  db.user_state.subscribeOne$(user_id || "device").subscribe((user_state) => {
    context.user_state = user_state;
  });
}
