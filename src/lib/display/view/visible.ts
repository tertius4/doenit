import { context } from "$logic/context.svelte";
import { visibleWhere } from "$logic/visibility";
import type { TableQuery } from "$domain/tables/base-table";

/**
 * Like `table.live(query)`, limited to what the current user may see (see visibility.ts). Read inside
 * `$derived(liveQuery(...))`, so group tasks appear and disappear with the group.
 */
export function visibleLive<T>(table: { live: (query: TableQuery) => import("@tertius4/sinkro-db").Live<T[]> }, query: TableQuery = {}) {
  return table.live({ ...query, where: { ...query.where, ...visibleWhere(context.user?.firebase_uid, context.active_scopes) } });
}
