<script>
  import { slide } from "svelte/transition";
  import { notifications } from "$lib/services/notification.svelte";
  import { XCircle, Clock, Loading } from "$lib/icon";
  import InputSwitch from "$lib/components/element/input/InputSwitch.svelte";
  import InputTime from "$lib/components/element/input/InputTime.svelte";
  import { t } from "$lib/services/language.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import Check from "$lib/icon/Check.svelte";

  let is_loading = $state(false);

  let saving = $state(false);
  let saved = $state(false);

  function handleTimeChange({ value }) {
    if (value === notifications.time) return;

    saving = true;
    setTimeout(() => {
      saving = false;
      saved = true;
      setTimeout(() => (saved = false), 2000);
    }, 1000);

    notifications.time = value;
  }

  async function requestPermission() {
    is_loading = true;

    try {
      const status = await notifications.requestPermission();
      notifications.status = status;
    } catch (error) {
      console.error("Permission request failed:", error);
    } finally {
      is_loading = false;
    }
  }
</script>

<Accordion label={t("notifications")}>
  <!-- Main toggle with better explanation -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{t("reminders")}</span>
      <InputSwitch bind:value={notifications.enabled} />
    </div>
    <!-- Toggle for past due date notifications -->
    {#if notifications.enabled}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{t("notify_past_due_tasks")}</span>
        <InputSwitch bind:value={notifications.past_tasks_enabled} />
      </div>
    {/if}

    <!-- Permission status with visual indicator -->
    {#if notifications.enabled}
      {#if notifications.status !== "granted"}
        <div class="flex items-center gap-3 p-3 rounded-lg bg-t-secondary/5 border border-t-secondary/10">
          {#if notifications.status === "denied"}
            <XCircle size={20} class="text-red-600 dark:text-red-400" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-sm text-red-600 dark:text-red-400">{t("notification_denied")}</span>
                <button
                  class="text-sm px-3 py-1 rounded-full bg-t-primary-600 text-secondary hover:bg-t-primary-700 transition-colors"
                  onclick={requestPermission}
                  disabled={is_loading}
                >
                  {is_loading ? t("loading") : t("request_permission")}
                </button>
              </div>
            </div>
          {:else}
            <Clock size={20} class="text-yellow-600 dark:text-yellow-400" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-sm text-yellow-600 dark:text-yellow-400">{t("notification_pending")}</span>
                <button
                  class="text-sm px-3 py-1 rounded-full bg-t-primary-600 text-secondary hover:bg-t-primary-700 transition-colors"
                  onclick={requestPermission}
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
            <Clock size={16} />
            {t("reminder_time")}
          </span>
          <div class="h-12 relative">
            <InputTime
              value={notifications.time}
              can_clear={false}
              onchange={handleTimeChange}
              placeholder={t("choose_time")}
            />

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
        </div>
      </div>
    {/if}
  </div>
</Accordion>
