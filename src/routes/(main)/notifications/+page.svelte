<script>
  import DB from "$domain/db";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import NotificationList from "$display/notifications/NotificationList.svelte";
  import t from "$display/translate";
  import { onMount, onDestroy } from "svelte";
  import { backHandler } from "$logic/navigation";
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";

  let notifications = $state.raw(/** @type {DB.Notification[]} */ ([]));
  let unsubscribe = () => {};
  
  onMount(() => {
    const token = backHandler.register(() => goto("/"), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(() => {
    Api.notifications.pull().catch((error) => console.warn("[notifications] pull failed:", error));
  });

  $effect(() => {
    const user_id = context.user?.firebase_uid ?? "";

    unsubscribe();
    notifications = [];

    if (!user_id) return;

    const subscription = DB.notification
      .subscribe$({
        selector: { user_id },
        sort: [{ created_at: "desc" }],
      })
      .subscribe((items) => {
        notifications = items;
      });

    unsubscribe = () => subscription.unsubscribe();
  });

  onDestroy(() => unsubscribe());
</script>

{#if context.user?.firebase_uid}
  <NotificationList {notifications} />
{:else}
  <div class="h-full min-h-80 flex items-center justify-center text-center text-muted px-6">
    <p>{t("log_in_first")}</p>
  </div>
{/if}
