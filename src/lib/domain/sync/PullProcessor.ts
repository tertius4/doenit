import firestore from "$services/firestore";
import DB from "$domain/db";
import mergeEngine from "./MergeEngine";
import scopeManager from "./ScopeManager";
import { cursorKey, patchSyncCursors } from "./cursors";

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
          const key = cursorKey(scope_id);
          const { docs, cursor } = await firestore.fetch(scope_id, sync_cursors[key]);

          for (const remote of docs) {
            await mergeEngine.apply(remote, scope_id);
          }

          return [key, cursor] as const;
        } catch (err) {
          console.error(`[PullProcessor] Failed to pull scope ${scope_id}:`, err);
          return null;
        }
      }),
    );

    const pulled = results.filter((r) => r !== null);
    const cursor_updates = Object.fromEntries(pulled.filter(([key, cursor]) => sync_cursors[key] !== cursor));
    // The old device-clock cursor (bare scope id) is retired once the scope has been pulled the new way.
    const legacy_keys = scopes.filter((scope_id) => scope_id in sync_cursors);
    if (Object.keys(cursor_updates).length > 0 || legacy_keys.length > 0) {
      await patchSyncCursors(user_id, cursor_updates, legacy_keys);
    }
  }
}
