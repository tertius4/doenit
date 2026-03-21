import db from "$domain/db";
class ContextClass {
  private _user: DB.User | null = $state(null);
  private _settings: DB.Settings | null = $state(null);
  private _permissions: DB.Permissions | null = $state(null);

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
}
