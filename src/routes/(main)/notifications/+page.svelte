<script>
  import { subscribeList } from "$display/view/notifications";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import NotificationList from "$display/notifications/NotificationList.svelte";
  import t from "$display/translate";
  import { onMount, onDestroy } from "svelte";
  import { backHandler, navHistory } from "$logic/navigation";

  let notifications = $state.raw(/** @type {DB.Notification[]} */ ([]));
  let unsubscribe = () => {};
  
  onMount(() => {
    const token = backHandler.register(() => navHistory.back("/"), -1);
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

    unsubscribe = subscribeList(user_id, (items) => (notifications = items));
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
