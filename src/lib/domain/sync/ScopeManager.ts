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

  async getUserScopes(): Promise<string[]> {
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return [];

    console.log("[ScopeManager] Fetching scopes for user_id:", user_id);

    const state_result = await DB.user_state.get(user_id);
    if (!state_result.ok) return [];

    console.log("[ScopeManager] Fetched user scopes:", state_result);
    return state_result.value.active_scopes ?? [];
  }
}

const scopeManager = new ScopeManager();
export default scopeManager;
