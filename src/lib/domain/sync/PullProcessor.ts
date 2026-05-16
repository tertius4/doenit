import firestore from "$services/firestore";
import DB from "$domain/db";
import mergeEngine from "./MergeEngine";
import scopeManager from "./ScopeManager";

export class PullProcessor {
  static async run() {
    const scopes = await scopeManager.getUserScopes();
    console.log("[PullProcessor] Starting pull tick...", scopes);
    if (scopes.length === 0) return;

    // Kan dalk net die user-id deurstuur na UserScopes
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return;

    const state_result = await DB.user_state.get(user_id);
    if (!state_result.ok) return;

    const sync_cursors = state_result.value.sync_cursors ?? {};
    const cursor_updates: Record<string, string> = {};

    for (const scope_id of scopes) {
      try {
        const since = sync_cursors[scope_id];
        // Record time before fetching so the cursor doesn't skip concurrent writes
        const pullStartTime = new Date().toISOString();

        const remoteItems = await firestore.fetch(scope_id, since);

        for (const remote of remoteItems) {
          await mergeEngine.apply(remote);
        }

        cursor_updates[scope_id] = pullStartTime;
      } catch (err) {
        console.error(`[PullProcessor] Failed to pull scope ${scope_id}:`, err);
      }
    }

    if (Object.keys(cursor_updates).length > 0) {
      const updated_cursors = { ...sync_cursors, ...cursor_updates };
      await DB.user_state.update(user_id, { sync_cursors: updated_cursors });
    }
  }
}
