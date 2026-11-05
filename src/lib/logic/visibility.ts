import { isPersonalScope, LOCAL_CHANNEL, personalChannel } from "$domain/sinkro/tables";

/**
 * The channels of the tasks and categories the current user may see: their own personal channel and active groups, or
 * what was made signed out. Data of other accounts on this device stays in its own channels.
 */
export function visibleChannels(firebase_uid: string | null | undefined, scopes: string[]): string[] {
  if (!firebase_uid) return [LOCAL_CHANNEL];

  const group_scopes = scopes.filter((scope_id) => !isPersonalScope(scope_id));
  return [personalChannel(firebase_uid), ...group_scopes];
}

/** The same as a query. */
export function visibleWhere(firebase_uid: string | null | undefined, scopes: string[]): Record<string, any> {
  return { channel: { $in: visibleChannels(firebase_uid, scopes) } };
}
