import firestore from "$services/firestore";
import mergeEngine from "./MergeEngine";
import scopeManager from "./ScopeManager";

// In-memory cursor: tracks the timestamp of the last successful pull per scope.
// On a fresh start this is empty, so the first pull is always a full fetch.
const cursors = new Map<string, string>();

export class PullProcessor {
  static async run() {
    const scopes = await scopeManager.getUserScopes();

    for (const scope of scopes) {
      try {
        const since = cursors.get(scope);
        // Record time before fetching so the cursor doesn't skip concurrent writes
        const pullStartTime = new Date().toISOString();

        const remoteItems = await firestore.fetch(scope, since);

        for (const remote of remoteItems) {
          await mergeEngine.apply(remote);
        }

        cursors.set(scope, pullStartTime);
      } catch (err) {
        console.error(`[PullProcessor] Failed to pull scope ${scope}:`, err);
      }
    }
  }
}
