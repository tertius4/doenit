import DB from "$domain/db";
import firestore from "$services/firestore";

class ScopeManager {
  /**
   * Attaches a real-time Firestore listener for the current user's active scopes.
   * Fires immediately and on every membership change (including when coming back online).
   * Returns an unsubscribe function — call it when the listener is no longer needed.
   * Returns a no-op if no user is logged in.
   */
  async watchUserScopes(callback: (scopes: string[]) => void): Promise<() => void> {
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return () => {};

    const user = await DB.user.findById(user_id);
    if (!user.ok || !user.value) return () => {};

    const firebase_uid = user.value.firebase_uid;
    if (!firebase_uid) return () => {};

    return firestore.subscribeScopes(firebase_uid, callback);
  }

  /** Attaches a real-time listener on the current user's invite inbox. Returns a no-op unsubscribe when signed out. */
  async watchUserInvites(callback: () => void): Promise<() => void> {
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return () => {};

    const user = await DB.user.findById(user_id);
    const firebase_uid = user.ok ? user.value?.firebase_uid : null;
    if (!firebase_uid) return () => {};

    return firestore.subscribeInvites(firebase_uid, callback);
  }

  /** Attaches a real-time listener on the current user's notification inbox. Returns a no-op unsubscribe when signed out. */
  async watchUserNotifications(callback: () => void): Promise<() => void> {
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return () => {};

    const user = await DB.user.findById(user_id);
    const firebase_uid = user.ok ? user.value?.firebase_uid : null;
    if (!firebase_uid) return () => {};

    return firestore.subscribeNotifications(firebase_uid, callback);
  }

  /**
   * Deletes the local copies of a scope's data (tasks, categories, groups, members and queued pushes) after the
   * user lost access to it. Writes straight to the collections, so nothing is queued for sync.
   */
  async purgeLocalScope(scope_id: string): Promise<void> {
    const names = ["task", "category", "group", "member", "sync_queue"] as const;
    await Promise.all(
      names.map(async (name) => {
        const table = DB.getCollection(name);
        if (!table) return;

        await table.collection.find({ selector: { scope_id } } as any).remove();
      }),
    );
  }

  async getUserScopes(): Promise<string[]> {
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return [];

    const state_result = await DB.user_state.get(user_id);
    if (!state_result.ok) return [];

    return state_result.value.active_scopes ?? [];
  }
}

const scopeManager = new ScopeManager();
export default scopeManager;
