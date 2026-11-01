import { canAccess, defineAccess, memberOf } from "@tertius4/sinkro-db";

/**
 * Who may use a channel, as firestore.rules decides it. Documentation and tests only: those rules are written by hand.
 *
 * Doenit's channels do not fit the package's patterns: `personal_{uid}` cannot be split on ":", and membership lists
 * scopes per user where memberOf wants users per scope. So one pattern reads a made-up document, which scopeUsers fills.
 */
export const access = defineAccess({
  channels: { "{scope}": memberOf("scope_users/{scope}", "uids") },
});

/**
 * The users allowed in a scope, out of those given. A personal scope is only ever its owner's: anyone can put any id in
 * their own memberships, so membership must never grant it.
 */
function scopeUsers(scope_id: string, memberships: Record<string, string[]>): string[] {
  if (scope_id.startsWith("personal_")) return [scope_id.slice("personal_".length)];
  return Object.keys(memberships).filter((uid) => memberships[uid]?.includes(scope_id));
}

/** @param memberships  Each user's `users/{uid}/meta/memberships` scopes. */
export function canUseScope(uid: string | null, scope_id: string, memberships: Record<string, string[]>) {
  return canAccess(access, {
    target: { channel: scope_id },
    op: "write",
    uid,
    getDoc: async () => ({ uids: scopeUsers(scope_id, memberships) }),
  });
}
