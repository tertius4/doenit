import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import DB from "$lib/domain/db";
import scopeManager from "$lib/domain/sync/ScopeManager";
import { MembershipService } from "$lib/domain/sync/MembershipService";
import { Subscription, distinctUntilChanged, map } from "rxjs";
import Api from "$logic/api";
import syncEngine from "$domain/sync/SyncEngine";
import firestore from "$services/firestore";

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
let _scope_generation = 0;
let _app_subscriptions = new Subscription();

function subscribeForUser(user_id: string | null) {
  _user_subscriptions?.unsubscribe();
  _user_subscriptions = new Subscription();

  _scope_generation++;
  _scope_unsubscribe?.();
  _scope_unsubscribe = null;

  if (user_id) {
    const generation = _scope_generation;
    scopeManager
      .watchUserScopes(async (scopes) => {
        await DB.user_state.upsert({ id: user_id, user_id, active_scopes: scopes });
      })
      .then((unsub) => {
        // A newer subscribeForUser call already replaced this one, so drop the stale listener.
        if (generation !== _scope_generation) return unsub();
        _scope_unsubscribe = unsub;
      })
      .catch((err) => console.warn("[context] watchUserScopes failed:", err));

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

  // Reminders depend on the settings and on who is signed in (emits on subscribe, so also on sign-in / sign-out).
  _user_subscriptions.add(
    DB.settings
      .subscribeOne$(user_id || "device")
      .pipe(
        map((settings) => JSON.stringify(notificationSettings(settings))),
        distinctUntilChanged(),
      )
      .subscribe(() => Api.notifications.schedule()),
  );

  _user_subscriptions.add(
    DB.user_state.subscribeOne$(user_id || "device").subscribe((user_state) => {
      context.user_state = user_state;
    }),
  );
}

function notificationSettings(settings: DB.Settings | null) {
  return [
    settings?.notifications_enabled,
    settings?.present_task_reminder_enabled,
    settings?.present_task_reminder_time,
    settings?.past_task_reminder_enabled,
    settings?.past_task_reminder_time,
    settings?.language,
  ];
}

/**
 * Pulls remote state (memberships, invites, notifications) and flushes the sync queue.
 * Never throws - every step logs its own failure.
 */
async function syncRemote(user_id: string | null, firebase_uid: string | null, reconcile: boolean) {
  if (user_id && firebase_uid) {
    try {
      const scopes = reconcile ? await MembershipService.reconcileScopes(firebase_uid) : undefined;
      await MembershipService.sync(user_id, firebase_uid, scopes);
    } catch (err) {
      console.warn("[initApp] membership sync failed:", err);
    }

    await Promise.all([
      Api.invites.pull().catch((err) => console.warn("[initApp] invite pull failed:", err)),
      Api.notifications.pull().catch((err) => console.warn("[initApp] notification pull failed:", err)),
    ]);
  }

  try {
    await syncEngine.flush();
  } catch (err) {
    console.warn("[initApp] sync flush failed:", err);
  }
}

/**
 * A local session is only valid while Firebase still holds the same user; otherwise every Firestore call fails.
 * Users without a firebase_uid, or an unreadable Firebase state, are left alone.
 */
async function firebaseSessionMatches(user_id: string | null): Promise<boolean> {
  try {
    if (!user_id) throw Error("No User ID");

    const user_result = await DB.user.findById(user_id);
    const firebase_uid = user_result.ok ? user_result.value?.firebase_uid : null;
    if (!firebase_uid) return true;

    const current_uid = await firestore.getCurrentUid();
    return current_uid === firebase_uid;
  } catch (err) {
    console.warn("[initApp] Could not verify Firebase session:", err);
    return true;
  }
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

  const is_local_and_firebase_match = await firebaseSessionMatches(resolved_user_id);
  if (is_app_open && resolved_user_id && !is_local_and_firebase_match) {
    console.warn("[initApp] Firebase session missing or changed, signing out locally");
    await DB.session.update({ user_id: null });
    resolved_user_id = null;
  }

  // Ensure the correct settings document exists before subscribing.
  const settings_result = await DB.settings.getSettings(resolved_user_id ?? undefined);
  if (!settings_result.ok) {
    console.error("Failed to load settings:", settings_result.error);
  } else {
    context.settings = settings_result.value;
  }

  // Ensure user state document exists before subscribing.
  const user_state_result = await DB.user_state.get(resolved_user_id || "device");
  if (!user_state_result.ok) {
    console.error("Failed to load user state:", user_state_result.error);
  } else {
    context.user_state = user_state_result.value;
  }

  const user_result = resolved_user_id ? await DB.user.findById(resolved_user_id) : null;
  const firebase_uid = user_result?.ok ? (user_result.value?.firebase_uid ?? null) : null;
  context.user = user_result?.ok ? (user_result.value as DB.User | null) : null;

  subscribeForUser(resolved_user_id);

  // Network sync is not needed to render. On app open it runs in the background;
  // after sign-in / sign-out callers expect fresh data, so it is awaited.
  const remote_sync = syncRemote(resolved_user_id, firebase_uid, is_app_open);
  if (!is_app_open) await remote_sync;

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

      const update_result = await DB.app_state.update({
        device_id,
        app_version,
        last_opened_at: now,
        open_count: app_state_result.value.open_count + 1,
      });

      // Set synchronously: the subscription below emits asynchronously and callers read app_state right after initApp.
      context.app_state = update_result.ok ? update_result.value : app_state_result.value;
    }

    _app_subscriptions.unsubscribe();
    _app_subscriptions = new Subscription();
    _app_subscriptions.add(
      DB.app_state.subscribeOne$("current").subscribe((app_state: DB.AppState | null) => {
        context.app_state = app_state;
      }),
    );

    // Tasks change locally and through sync pulls (which bypass the tables), so watch the collection itself.
    _app_subscriptions.add(DB.task.collection.$.subscribe(() => Api.notifications.schedule()));
    Api.notifications.listenForTaps().catch((err) => console.warn("[initApp] notification tap listener failed:", err));
  }
}
