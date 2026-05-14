import firestore from "$services/firestore";
import DB from "$domain/db";

export const MembershipService = {
  /**
   * Fetches the user's scope memberships from Firestore and stores them in
   * local UserState. Call this after login and before SyncEngine.requestTick().
   * @param user_id  Local RxDB user ID (used as the user_state primary key).
   * @param firebase_uid  Firebase UID (used as the Firestore document key).
   */
  async sync(user_id: string, firebase_uid: string): Promise<void> {
    const scopes = await firestore.fetchMemberships(firebase_uid);

    await DB.user_state.upsert({
      id: user_id,
      user_id,
      active_scopes: scopes,
    });
  },

  /**
   * Adds a scope to a user's Firestore membership list if not already present.
   * Call this when a user joins or creates a shared scope (group).
   */
  async addScope(firebase_uid: string, scope_id: string): Promise<void> {
    const existing = await firestore.fetchMemberships(firebase_uid);
    if (existing.includes(scope_id)) return;
    await firestore.upsertMemberships(firebase_uid, [...existing, scope_id]);
  },
};
