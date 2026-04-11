import { InAppReview } from "@capacitor-community/in-app-review";
import { context } from "$logic/context.svelte";
import { Widget } from "$services/widget";
import { Capacitor } from "@capacitor/core";

export async function load({ url, params, parent }) {
  await parent();
  Widget.init();
  if (Capacitor.isNativePlatform()) {
    const is_a_20th_open = !(context.app_state.open_count % 20);
    if (is_a_20th_open) await InAppReview.requestReview();
  }

  return {
    is_home: !!(url.pathname === "/"),
    is_task_page: !!(url.pathname === "/create" || params.item_id),
    is_friends_page: !!(url.pathname === "/friends"),
    is_completed_page: !!(url.pathname === "/complete"),
  };
}
