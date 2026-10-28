import { isPersonalScope } from "$domain/sync/personal";

/**
 * Mango selector for the tasks and categories the current user may see. Personal documents belong to their owner
 * (signed out, that is "device"); group documents belong to the group's members.
 * @param user_id  The signed-in user's local id, or null when signed out.
 * @param scopes  The user's active scopes.
 */
export function visibleSelector(user_id: string | null | undefined, scopes: string[]): Record<string, any> {
  if (!user_id) return { owner_id: "device" };

  const group_scopes = scopes.filter((scope_id) => !isPersonalScope(scope_id));
  return { $or: [{ owner_id: user_id }, { scope_id: { $in: group_scopes } }] };
}
