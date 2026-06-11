<script>
  import Api from "$logic/api";
  import { NotificationRouter } from "$domain/notifications/NotificationRouter";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import DateUtil from "$display/date-util";
  import { context } from "$logic/context.svelte";

  /** @type {{ notifications: DB.Notification[] }} */
  const { notifications = [] } = $props();

  /** @param {DB.Notification} notification */
  async function open(notification) {
    if (!notification.read_at) {
      await Api.notifications.markAsRead(notification);
    }

    await NotificationRouter.open(notification);
  }

  /** @param {string} timestamp */
  function formatDate(timestamp) {
    const locale = context.settings.language == "en" ? "en-GB" : "af-ZA";
    return DateUtil.format(timestamp, "D MMM YYYY, HH:mm", { locale });
  }
</script>

<ul class="space-y-2">
  {#each notifications as notification (notification.id)}
    <li>
      <button
        type="button"
        onclick={() => open(notification)}
        class={{
          "w-full bg-surface rounded-lg px-4 py-3 text-left flex gap-3 border transition-colors hover:bg-card active:bg-card": true,
          "border-primary": !notification.read_at,
          "border-default": !!notification.read_at,
        }}
      >
        <div
          class={{
            "mt-0.5 rounded-full p-2 shrink-0": true,
            "bg-primary text-white": !notification.read_at,
            "bg-card text-muted": !!notification.read_at,
          }}
        >
          <Icon name="bell" class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold text-sm line-clamp-2">{notification.title}</p>
            <time class="text-xs text-muted shrink-0 pt-0.5">{formatDate(notification.created_at)}</time>
          </div>
          <p class="mt-1 text-sm text-muted line-clamp-2">{notification.body}</p>
        </div>
      </button>
    </li>
  {:else}
    <div class="h-full min-h-80 flex flex-col items-center justify-center text-center text-muted px-6">
      <Icon name="bell" class="w-10 h-10 mb-3" />
      <p class="font-semibold">{t("no_notifications")}</p>
    </div>
  {/each}
</ul>
