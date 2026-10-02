import firestore from "$services/firestore";
import DB from "$domain/db";
import mergeEngine from "./MergeEngine";
import scopeManager from "./ScopeManager";
import { patchSyncCursors, withClockSkew } from "./cursors";

export class PullProcessor {
  static async run() {
    const scopes = await scopeManager.getUserScopes();
    if (scopes.length === 0) return;

    // Kan dalk net die user-id deurstuur na UserScopes
    const session_result = await DB.session.get();
    const user_id = session_result.ok ? session_result.value.user_id : null;
    if (!user_id) return;

    const state_result = await DB.user_state.get(user_id);
    if (!state_result.ok) return;

    const sync_cursors = state_result.value.sync_cursors ?? {};
    const results = await Promise.all(
      scopes.map(async (scope_id) => {
        try {
          const since = withClockSkew(sync_cursors[scope_id]);
          // Record time before fetching so the cursor doesn't skip concurrent writes
          const pullStartTime = new Date().toISOString();

          const remoteItems = await firestore.fetch(scope_id, since);

          for (const remote of remoteItems) {
            await mergeEngine.apply(remote);
          }

          return [scope_id, pullStartTime] as const;
        } catch (err) {
          console.error(`[PullProcessor] Failed to pull scope ${scope_id}:`, err);
          return null;
        }
      }),
    );

    const cursor_updates = Object.fromEntries(results.filter((r) => r !== null));
    if (Object.keys(cursor_updates).length > 0) {
      await patchSyncCursors(user_id, cursor_updates);
    }
  }
}
