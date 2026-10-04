<script lang="ts">
  import Api from "$logic/api";
  import Icon from "$display/comps/Icon.svelte";
  import t, { type TranslationKey } from "$display/translate";
  import DateUtil from "$display/date-util";
  import { context } from "$logic/context.svelte";

  interface Props {
    notifications: DB.Notification[];
  }

  const { notifications = [] }: Props = $props();

  async function open(notification: DB.Notification) {
    if (!notification.read_at) {
      await Api.notifications.markAsRead(notification);
    }

    await Api.notifications.open(notification);
  }

  function formatDate(timestamp: string) {
    const locale = context.settings.language == "en" ? "en-GB" : "af-ZA";
    return DateUtil.format(timestamp, "D MMM YYYY, HH:mm", { locale });
  }

  /**
   * @return {{ title: string; body: string }}
   */
  function notificationText(notification: DB.Notification) {
    const data = notification.data ?? {};
    const email = typeof data.email === "string" ? data.email : "";
    const group = typeof data.group_name === "string" ? data.group_name : "";

    const task = typeof data.task_name === "string" ? data.task_name : "";
    const user = typeof data.user_name === "string" ? data.user_name : "";

    /** What each type needs before it can be translated. */
    const required: Partial<Record<DB.NotificationType, boolean>> = {
      invite_received: !!email,
      invite_accepted: !!email,
      group_added: !!group,
      group_removed: !!group,
      group_deleted: !!group,
      user_left_group: !!group && !!user,
      task_assigned: !!task,
      task_completed: !!task && !!group && !!user,
    };

    if (!required[notification.type]) return { title: notification.title, body: notification.body };

    return {
      title: t(`notification_${notification.type}_title` as TranslationKey),
      body: t(`notification_${notification.type}_body` as TranslationKey, { email, group, task, user }),
    };
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
            "mt-0.5 rounded-full p-2 shrink-0 h-fit": true,
            "bg-primary text-white": !notification.read_at,
            "bg-card text-muted": !!notification.read_at,
          }}
        >
          <Icon name="bell" class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold text-sm line-clamp-2">{notificationText(notification).title}</p>
            <time class="text-xs text-muted shrink-0 pt-0.5">{formatDate(notification.created_at)}</time>
          </div>
          <p class="mt-1 text-sm text-muted line-clamp-2">{notificationText(notification).body}</p>
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
