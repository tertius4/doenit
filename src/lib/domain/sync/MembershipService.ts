import firestore from "$services/firestore";
import DB from "$domain/db";
import { SyncQueue } from "./SyncQueue";
import { isPersonalScope, PERSONAL_TABLES, personalScope } from "./personal";
import { ContactNames } from "./ContactNames";
import { context } from "$logic/context.svelte";

export const MembershipService = {
  /**
   * Fetches the user's scope memberships from Firestore and stores them in
   * local UserState. Call this after login and before SyncEngine.requestTick().
   * @param user_id  Local RxDB user ID (used as the user_state primary key).
   * @param firebase_uid  Firebase UID (used as the Firestore document key).
   * @param known_scopes  Already-fetched memberships (e.g. from reconcileScopes) to avoid a second fetch.
   */
  async sync(user_id: string, firebase_uid: string, known_scopes?: string[]): Promise<void> {
    const scopes = known_scopes ?? (await firestore.fetchMemberships(firebase_uid));
    const previous = await DB.user_state.get(user_id);

    await DB.user_state.upsert({
      id: user_id,
      user_id,
      active_scopes: scopes,
    });
    await this.applyPersonalSync(firebase_uid, previous.ok ? (previous.value.active_scopes ?? []) : [], scopes);
  },

  /**
   * Follows personal sync being on or off. When it was just turned on (here or on another device), queues every local
   * personal task and category and uploads the contact names, so this device's personal data reaches the cloud too.
   * Later changes are queued by the tables themselves.
   * @param previous_scopes  The active scopes stored locally before this change.
   * @param scopes  The active scopes from the memberships document.
   */
  async applyPersonalSync(firebase_uid: string, previous_scopes: string[], scopes: string[]): Promise<void> {
    const scope_id = personalScope(firebase_uid);
    const enabled = scopes.includes(scope_id);
    const just_enabled = enabled && !previous_scopes.includes(scope_id);

    // Before watching, so this device's names are uploaded before the synced ones are applied.
    if (just_enabled) await ContactNames.uploadAll(firebase_uid);
    ContactNames.watch(firebase_uid, enabled);
    if (!just_enabled) return;

    for (const table_name of PERSONAL_TABLES) {
      const table = DB.getCollection(table_name);
      if (!table) continue;

      const docs = await table.collection.find({ selector: { soft_deleted: { $ne: true } } } as any).exec();
      const personal = docs.filter((doc: any) => !doc.scope_id && doc.owner_id === context.user?.id);
      if (!personal.length) continue;

      await SyncQueue.enqueueMany(
        personal.map((doc: any) => ({ table_name, entity_id: doc.id, scope_id, op: "upsert" as const })),
      );
    }
  },

  /**
   * Adds a scope to a user's Firestore membership list (idempotent, atomic).
   * Call this when a user joins or creates a shared scope (group).
   */
  async addScope(firebase_uid: string, scope_id: string): Promise<void> {
    await firestore.addMembership(firebase_uid, scope_id);
  },

  /**
   * Removes a scope from a user's Firestore membership list (idempotent, atomic).
   * Call this when a user leaves or is removed from a shared scope (group).
   */
  async removeScope(firebase_uid: string, scope_id: string): Promise<void> {
    await firestore.removeMembership(firebase_uid, scope_id);
  },

  /**
   * Reconciles a user's Firestore scope memberships against the live Firestore scope data.
   * Any scope whose group document is soft-deleted in Firestore is removed from memberships.
   * Call this on app startup after Firestore is initialised.
   * Returns the (cleaned) membership list so callers don't need to fetch it again.
   */
  async reconcileScopes(firebase_uid: string): Promise<string[]> {
    const existing = await firestore.fetchMemberships(firebase_uid);
    if (existing.length === 0) return existing;

    // The personal scope has no group document to check.
    const group_scopes = existing.filter((scope_id) => !isPersonalScope(scope_id));

    // Only a definite "deleted" answer marks a scope stale. A failed lookup (e.g. offline) keeps the scope.
    const stale: string[] = [];
    await Promise.all(
      group_scopes.map(async (scope_id) => {
        try {
          if (await firestore.scopeDeleted(scope_id)) stale.push(scope_id);
        } catch (err) {
          console.warn(`[MembershipService] Could not verify scope ${scope_id}:`, err);
        }
      }),
    );

    if (stale.length === 0) return existing;

    console.warn("[MembershipService] Reconciling stale scopes:", stale);
    await Promise.all(stale.map((scope_id) => firestore.removeMembership(firebase_uid, scope_id)));
    return existing.filter((s) => !stale.includes(s));
  },
};
