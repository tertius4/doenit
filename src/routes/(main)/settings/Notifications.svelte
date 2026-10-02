<script>
  import { slide } from "svelte/transition";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import t from "$display/translate";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import InputTime from "$display/comps/input/InputTime.svelte";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import Api from "$logic/api";

  const enabled = $derived(context.settings.notifications_enabled);

  /** @param {boolean} value */
  async function updatePush(value) {
    await Api.settings.update({ push_notifications_enabled: value });

    if (value) {
      const registered = await Api.notifications.registerPush({ prompt: true });
      if (!registered) toast.warning(t("notification_permission_denied"));
    }
  }

  /** @param {Partial<Domain.Settings>} changes */
  async function update(changes) {
    await Api.settings.update(changes);

    // Ask for the OS permission while the user is turning a reminder on.
    if (Object.values(changes).includes(true)) {
      const result = await Api.notifications.requestPermission();
      if (result.ok && !result.value) toast.warning(t("notification_permission_denied"));
    }
  }
</script>

<Accordion label={t("notifications")}>
  <!-- Main toggle with better explanation -->
  <div class="space-y-4">
    {#if context.user}
      <div class="flex items-center gap-2">
        <InputSwitch value={context.settings.push_notifications_enabled !== false} onchange={updatePush} />
        <span class="text-sm font-medium">{t("push_notifications")}</span>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <InputSwitch
        value={context.settings.notifications_enabled}
        onchange={(value) => update({ notifications_enabled: value })}
      />
      <span class="text-sm font-medium">{t("reminders")}</span>
    </div>

    <!-- Toggle for past due date notifications -->
    {#if enabled}
      <div class="space-y-4" transition:slide>
        <div class="flex items-center gap-2">
          <InputSwitch
            value={context.settings.present_task_reminder_enabled}
            onchange={(value) => update({ present_task_reminder_enabled: value })}
          />
          <span class="text-sm font-medium">{t("notify_due_tasks")}</span>
        </div>

        {#if context.settings.present_task_reminder_enabled}
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
            </div>
          </div>
        {/if}

        <div class="flex items-center gap-2">
          <InputSwitch
            value={context.settings.past_task_reminder_enabled}
            onchange={(value) => update({ past_task_reminder_enabled: value })}
          />
          <span class="text-sm font-medium">{t("notify_past_due_tasks")}</span>
        </div>

        {#if context.settings.past_task_reminder_enabled}
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
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Accordion>
