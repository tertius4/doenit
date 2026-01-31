<script>
  import { slide } from "svelte/transition";
  import { notifications } from "$lib/services/notification.svelte";
  import InputSwitch from "$lib/components/element/input/InputSwitch.svelte";
  import InputTime from "$lib/components/element/input/InputTime.svelte";
  import { t } from "$lib/services/language.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { user } from "$lib/base/user.svelte";
  import { untrack } from "svelte";

  let is_loading = $state(false);

  let saving = $state(false);
  let saved = $state(false);
  let enabled = $state(user.notifications.enabled);
  let time = $state(user.notifications.time);

  $effect(() => {
    enabled;
    time;

    untrack(async () => {
      user.updateNotificationSettings({ enabled, time });
      await notifications.scheduleNotifications();

      enabled = user.notifications.enabled;
      time = user.notifications.time;
    });
  });

  /**
   *
   * @param {{ value: string }}param0
   */
  function handleTimeChange({ value }) {
    if (value === time) return;
    if (!value) {
      time = user.notifications.time;
      return;
    }

    user.updateNotificationSettings({ time: value });
    notifications.scheduleNotifications();

    saving = true;
    setTimeout(() => {
      saving = false;
      saved = true;
      setTimeout(() => (saved = false), 2 * 1000);
    }, 1000);
  }

  async function handleRequestPermission() {
    try {
      is_loading = true;
      await user.requestNotificationsPermission();
      is_loading = false;
    } catch (error) {
      console.error("Permission request failed:", error);
    }
  }
</script>

<Accordion label={t("notifications")}>
  <!-- Main toggle with better explanation -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{t("reminders")}</span>
      <InputSwitch bind:value={enabled} />
    </div>

    <!-- Toggle for past due date notifications -->
    {#if enabled}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{t("notify_past_due_tasks")}</span>
        <InputSwitch bind:value={user.notifications.past_tasks} />
      </div>
    {/if}

    <!-- Permission status with visual indicator -->
    {#if enabled}
      {#if notifications.status !== "granted"}
        <div class="flex items-center gap-3 p-3 rounded-lg bg-t-secondary/5 border border-t-secondary/10">
          {#if notifications.status === "denied"}
            <Icon name="x-circle" class="text-red-600 dark:text-red-400" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-sm text-red-600 dark:text-red-400">{t("notification_denied")}</span>
                <button
                  class="text-sm px-3 py-1 rounded-full bg-t-primary-600 text-secondary hover:bg-t-primary-700 transition-colors"
                  onclick={handleRequestPermission}
                  disabled={is_loading}
                >
                  {is_loading ? t("loading") : t("request_permission")}
                </button>
              </div>
            </div>
          {:else}
            <Icon name="clock" class="text-yellow-600 dark:text-yellow-400" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-sm text-yellow-600 dark:text-yellow-400">{t("notification_pending")}</span>
                <button
                  class="text-sm px-3 py-1 rounded-full bg-t-primary-600 text-secondary hover:bg-t-primary-700 transition-colors"
                  onclick={handleRequestPermission}
                  disabled={is_loading}
                >
                  {is_loading ? t("loading") : t("request_permission")}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div transition:slide class="space-y-4">
        <!-- Time picker with better layout -->
        <div>
          <span class="flex items-center gap-2 text-sm font-medium mb-2">
            <Icon name="clock" class="w-5 h-5" />
            {t("reminder_time")}
          </span>
          <div class="h-12 relative">
            <InputTime value={time} can_clear={false} onchange={handleTimeChange} placeholder={t("choose_time")} />

            <div class="absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center">
              {#if saving}
                <div in:slide={{ duration: 200 }}>
                  <Icon name="loading" class="animate-spin" />
                </div>
              {:else if saved}
                <div
                  in:slide={{ duration: 200 }}
                  out:slide={{ duration: 200 }}
                  class="border-2 rounded-full border-success aspect-square h-fit p-1"
                >
                  <Icon name="check" class="text-success text-sm" />
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Accordion>
