/**
 * Personal tasks and private lists sync through scopes/personal_{uid}/items while the user has device sync on.
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
export const PERSONAL_TABLES = ["task", "list"];

/**
 * A UUID-shaped id derived from `parts`. Devices that make the same document independently (every member migrating
 * the same group, or a task moved into the same list twice) then make one document instead of duplicates.
 */
export async function stableId(...parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("|"));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const hex = Array.from(hash.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Mango selector for the tasks and lists the current user may see. Personal documents belong to their owner
 * (signed out, that is "device"); a shared list's documents belong to its members.
 * @param user_id  The signed-in user's local id, or null when signed out.
 * @param scopes  The user's active scopes.
 */
export function visibleSelector(user_id: string | null | undefined, scopes: string[]): Record<string, any> {
  if (!user_id) return { owner_id: "device" };

  const shared_scopes = scopes.filter((scope_id) => !isPersonalScope(scope_id));
  return { $or: [{ owner_id: user_id }, { scope_id: { $in: shared_scopes } }] };
}
