<script>
  import { slide } from "svelte/transition";
  import { notifications } from "$lib/services/notification.svelte";
  import InputSwitch from "$lib/components/element/input/InputSwitch.svelte";
  import InputTime from "$lib/components/element/input/InputTime.svelte";
  import { t } from "$lib/services/language.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import { user } from "$lib/base/user.svelte";
  import { untrack } from "svelte";
  import { Check, Loading } from "$lib/icon";

  let saving = $state(false);
  let saved = $state(false);
  let enabled = $state(user.daily_summary.enabled);
  let time = $state(user.daily_summary.time);

  $effect(() => {
    enabled;

    untrack(async () => {
      user.updateDailySummarySettings({ enabled });

      if (enabled) {
        await notifications.scheduleDailySummary();
      } else {
        // Cancel daily summary notification when disabled
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.cancel({ notifications: [{ id: 999999 }] });
      }

      enabled = user.daily_summary.enabled;
    });
  });

  /**
   * @param {{ value: string }} param0
   */
  function handleTimeChange({ value }) {
    if (value === time) return;
    if (!value) {
      time = user.daily_summary.time;
      return;
    }

    user.updateDailySummarySettings({ time: value });
    notifications.scheduleDailySummary();

    saving = true;
    setTimeout(() => {
      saving = false;
      saved = true;
      setTimeout(() => (saved = false), 2 * 1000);
    }, 1000);
  }
</script>

<Accordion label={t("daily_summary")}>
  <div class="space-y-4">
    <!-- Main toggle -->
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="text-sm font-medium">
          {enabled ? t("daily_summary_enabled") : t("daily_summary_disabled")}
        </div>
        <div class="text-xs text-muted mt-1">{t("daily_summary_description")}</div>
      </div>
      <InputSwitch bind:value={enabled} />
    </div>

    <!-- Time picker -->
    {#if enabled}
      <div transition:slide class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{t("notification_time")}</span>
        </div>

        <div class="h-12 relative">
          <InputTime value={time} can_clear={false} onchange={handleTimeChange} placeholder={t("choose_time")} />
          <div class="absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center">
            {#if saving}
              <div in:slide={{ duration: 200 }}>
                <Loading />
              </div>
            {:else if saved}
              <div
                in:slide={{ duration: 200 }}
                out:slide={{ duration: 200 }}
                class="border-2 rounded-full border-success aspect-square h-fit p-1"
              >
                <Check stroke-width={4} class="text-success text-sm" />
              </div>
            {/if}
          </div>
        </div>

        <div class="text-xs text-muted mt-2">
          {t("daily_summary_time_description")}
        </div>
      </div>
    {/if}
  </div>
</Accordion>
