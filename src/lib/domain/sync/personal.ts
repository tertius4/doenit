/**
 * Personal tasks and categories sync through scopes/personal_{uid}/items while the user has device sync on.
 * Locally they keep scope_id null; only the sync queue, pull cursors and listeners use this scope id.
 * Firestore rules only let the user themselves into it (a membership entry never grants it).
 */
export function personalScope(firebase_uid: string): string {
  return `personal_${firebase_uid}`;
}

export function isPersonalScope(scope_id: string): boolean {
  return scope_id.startsWith("personal_");
}

/** Tables whose personal (scope_id null) documents are synced. */
export const PERSONAL_TABLES = ["task", "category"];
