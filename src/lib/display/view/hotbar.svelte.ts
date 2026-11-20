import { subscribeFilterOptions } from "./lists.js";
import type { Subscription } from "rxjs";

/**
 * The hotbar's lists live at module scope on purpose.
 *
 * Keeping them in the component meant the list restarted empty on every mount, so the
 * `{#if lists.length}` in Hotbar.svelte always flipped false -> true and always played an
 * intro transition that animated `height` up from 0. On iOS that animation can be suspended while
 * the webview is still behind the launch screen and left on its 0% frame, leaving the hotbar in the
 * DOM but zero-height. Module scope survives unmount, so the list is already populated on remount
 * and there is no flip to animate.
 */
export const hotbar_lists: AL.ListOption[] = $state([]);

let subscription: Subscription | undefined;

/** Subscribes once per app session. Safe to call from every mount; later calls are no-ops. */
export function startHotbarLists() {
  if (subscription) return;
  subscription = subscribeFilterOptions().subscribe((data) => hotbar_lists.splice(0, hotbar_lists.length, ...data));
}
