<script>
  import { list } from "$display/view/notifications";
  import { liveQuery } from "@tertius4/sinkro-db/svelte";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import NotificationList from "$display/notifications/NotificationList.svelte";
  import t from "$display/translate";
  import { onMount } from "svelte";
  import { backHandler, navHistory } from "$logic/navigation";

  const notifications_query = $derived(liveQuery(() => list(context.user?.firebase_uid ?? ""), []));
  const notifications = $derived(notifications_query.current ?? []);

  onMount(() => {
    const token = backHandler.register(() => navHistory.back("/"), -1);
    return () => backHandler.unregister(token);
  });

  onMount(() => {
    Api.notifications.pull().catch((error) => console.warn("[notifications] pull failed:", error));
  });

</script>

{#if context.user?.firebase_uid}
  <NotificationList {notifications} />
{:else}
  <div class="h-full min-h-80 flex items-center justify-center text-center text-muted px-6">
    <p>{t("log_in_first")}</p>
  </div>
{/if}
