import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import DB from "$lib/domain/db";
import scopeManager from "$lib/domain/sync/ScopeManager";
import { MembershipService } from "$lib/domain/sync/MembershipService";
import { Subscription } from "rxjs";
import Api from "$logic/api";

class ContextClass {
  private _user: DB.User | null = $state(null);
  _settings: DB.Settings | null = $state(null);
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
let _scope_unsubscribe: (() => void) | null = null;

function subscribeForUser(user_id: string | null) {
  _user_subscriptions?.unsubscribe();
  _user_subscriptions = new Subscription();

  _scope_unsubscribe?.();
  _scope_unsubscribe = null;

  if (user_id) {
    scopeManager
      .watchUserScopes(async (scopes) => {
        await DB.user_state.upsert({ id: user_id, user_id, active_scopes: scopes });
      })
      .then((unsub) => {
        _scope_unsubscribe = unsub;
      });

    _user_subscriptions.add(
      DB.user.subscribeOne$(user_id).subscribe((user) => {
        context.user = user;
      }),
    );
  } else {
    context.user = null;
  }

  _user_subscriptions.add(
    DB.settings.subscribeOne$(user_id || "device").subscribe((settings) => {
      context.settings = settings;
    }),
  );

  _user_subscriptions.add(
    DB.user_state.subscribeOne$(user_id || "device").subscribe((user_state) => {
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
    const result = await DB.session.get();
    resolved_user_id = (result.ok && result.value.user_id) || null;
  } else {
    resolved_user_id = user_id;
  }

  // Ensure the correct settings document exists before subscribing.
  const settings_result = await DB.settings.getSettings(resolved_user_id ?? undefined);
  if (!settings_result.ok) {
    console.error("Failed to load settings:", settings_result.error);
  }

  // Ensure user state document exists before subscribing.
  const user_state_result = await DB.user_state.get(resolved_user_id || "device");
  if (!user_state_result.ok) {
    console.error("Failed to load user state:", user_state_result.error);
  }

  if (is_app_open && resolved_user_id) {
    const user_result = await DB.user.findById(resolved_user_id);
    const firebase_uid = user_result.ok ? user_result.value?.firebase_uid : null;
    if (firebase_uid) {
      MembershipService.reconcileScopes(firebase_uid).catch((err) =>
        console.warn("[initApp] reconcileScopes failed:", err),
      );
    }
  }

  subscribeForUser(resolved_user_id);
  setTimeout(() => Api.invites.pull(), 300); // TODO This is bad - race condition.

  if (is_app_open) {
    const app_state_result = await DB.app_state.getDevice();
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

      await DB.app_state.update({
        device_id,
        app_version,
        last_opened_at: now,
        open_count: app_state_result.value.open_count + 1,
      });
    }

    DB.app_state.subscribeOne$("current").subscribe((app_state: DB.AppState | null) => {
      context.app_state = app_state;
    });
  }
}
