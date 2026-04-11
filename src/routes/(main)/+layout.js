import { InAppReview } from "@capacitor-community/in-app-review";
import { context } from "$logic/context.svelte";
import { Widget } from "$services/widget";
import { Capacitor } from "@capacitor/core";
import { mount } from "svelte";
import DrawerLanguage from "$display/features/settings/DrawerLanguage.svelte";
import { browser } from "$app/environment";

export async function load({ url, params, parent }) {
  await parent();
  Widget.init();
  if (Capacitor.isNativePlatform()) {
    const is_a_20th_open = !(context.app_state.open_count % 20);
    if (is_a_20th_open) await InAppReview.requestReview();
  }

  if (!!browser && !context.settings.language) {
    mount(DrawerLanguage, { target: document.body });
  }

  return {
    is_home: !!(url.pathname === "/"),
    is_task_page: !!(url.pathname === "/create" || params.task_id),
    is_friends_page: !!(url.pathname === "/friends"),
    is_completed_page: !!(url.pathname === "/complete"),
  };
}
