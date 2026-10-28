import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { visibleSelector } from "$logic/visibility";
import { distinctUntilChanged, map, switchMap } from "rxjs";

/**
 * Like `table.subscribe$(query)`, limited to what the current user may see (see visibility.ts). Re-queries when the
 * user's memberships change, so group tasks appear and disappear with the group.
 * @template T
 * @param {{ subscribe$: (query: any) => import("rxjs").Observable<T[]> }} table
 * @param {{ selector?: Record<string, any>, sort?: any[] }} [query]
 * @returns {import("rxjs").Observable<T[]>}
 */
export function visible$(table, query = {}) {
  const user_id = context.user?.id ?? null;

  return DB.user_state.subscribeOne$(user_id || "device").pipe(
    map((state) => state?.active_scopes ?? []),
    distinctUntilChanged((a, b) => a.length === b.length && a.every((id, i) => id === b[i])),
    switchMap((scopes) =>
      table.subscribe$({ ...query, selector: { $and: [query.selector ?? {}, visibleSelector(user_id, scopes)] } }),
    ),
  );
}
