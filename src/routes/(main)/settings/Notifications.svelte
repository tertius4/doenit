<script>
  import { slide } from "svelte/transition";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import t from "$display/translate";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import InputTime from "$display/comps/input/InputTime.svelte";
  import { context } from "$logic/context.svelte";
  import Api from "$logic/api";

  let saving = $state(false);
  let saved = $state(false);

  const enabled = $derived(context.settings.notifications_enabled);
</script>

<Accordion label={t("notifications")}>
  <!-- Main toggle with better explanation -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{t("reminders")}</span>
      <InputSwitch
        value={context.settings.notifications_enabled}
        onchange={(value) => Api.settings.update({ notifications_enabled: value })}
      />
    </div>

    <!-- Toggle for past due date notifications -->
    {#if enabled}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{t("notify_past_due_tasks")}</span>
        <InputSwitch
          value={context.settings.present_task_reminder_enabled}
          onchange={(value) => Api.settings.update({ present_task_reminder_enabled: value })}
        />
      </div>

      <div transition:slide>
        <!-- Time picker with better layout -->

        <span class="flex items-center gap-2 text-sm font-medium mb-2">
          <Icon name="clock" class="w-5 h-5" />
          {t("reminder_time")}
        </span>
        <div class="h-12 relative">
          <InputTime
            value={context.settings.present_task_reminder_time}
            can_clear={false}
            onchange={(value) => Api.settings.update({ present_task_reminder_time: value })}
            placeholder={t("choose_time")}
          />

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

      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{t("notify_past_due_tasks")}</span>
        <InputSwitch
          value={context.settings.past_task_reminder_enabled}
          onchange={(value) => Api.settings.update({ past_task_reminder_enabled: value })}
        />
      </div>

      <div transition:slide>
        <!-- Time picker with better layout -->

        <span class="flex items-center gap-2 text-sm font-medium mb-2">
          <Icon name="clock" class="w-5 h-5" />
          {t("reminder_time")}
        </span>
        <div class="h-12 relative">
          <InputTime
            value={context.settings.past_task_reminder_time}
            can_clear={false}
            onchange={(value) => Api.settings.update({ past_task_reminder_time: value })}
            placeholder={t("choose_time")}
          />

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
    {/if}
  </div>
</Accordion>
