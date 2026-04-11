<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";
  import { slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import SliderInterval from "./SliderInterval.svelte";
  import SliderNumber from "./SliderNumber.svelte";
  /** @typedef {0 | 1 | 2 | 3 | 4 | 5 | 6} DaysOfWeekNumbers */

  /**
   * @typedef {Object} Props
   * @property {Domain.Task['repeat_interval']} interval - The current value of the repeat option.
   * @property {number} number - The interval number for the repeat option.
   * @property {DaysOfWeekNumbers[]} days - The selected days for the repeat option.
   */

  /** @type {Props} */
  let { interval = $bindable(), number = $bindable(1), days = $bindable([]) } = $props();

  const is_other = $derived(number > 1);
  const label = $derived.by(() => {
    if (!interval) return t("no_repeat");
    if (is_other) return t("every") + ` ${number} ` + t(REVERSE_INTERVAL_MAP[interval] || "");
    return interval_options[interval];
  });
  let is_dialog_open = $state(false);
  let is_other_dialog_open = $state(false);

  const DAYS_OF_WEEK = $derived([t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")]);

  /** @type {Record<string, string>} */
  const interval_options = $derived({
    "": t("no_repeat"),
    daily: t("daily"),
    workdaily: t("daily_workdays"),
    weekly_custom_days: t("weekly_custom"),
    weekly: t("weekly"),
    monthly: t("monthly"),
    yearly: t("yearly"),
    other: t("other"),
  });

  /** @type {Record<string, string>} */
  const REVERSE_INTERVAL_MAP = $derived({
    daily: t("days"),
    weekly: t("weeks"),
    monthly: t("months"),
    yearly: t("years"),
  });

  function clearRepeat() {
    interval = "";
    number = 1;
    days = [];
  }

  /** @param {DaysOfWeekNumbers} index */
  function toggleDay(index) {
    if (days.includes(index)) {
      days = days.filter((day) => day !== index);
    } else {
      days = [...days, index];
    }
  }
</script>

<div class="relative">
  <button
    class={{
      "bg-card text-left border border-default p-2 w-full rounded-lg appearance-none outline-none": true,
      "text-muted": !interval,
      "text-normal": interval,
    }}
    onclick={() => (is_dialog_open = !is_dialog_open)}
    type="button"
  >
    {label}
  </button>

  {#if interval}
    <ButtonClear onclick={clearRepeat} class="absolute right-0 top-0 bottom-0" />
  {/if}
</div>

{#if interval === "weekly_custom_days"}
  <div transition:slide class="flex justify-between items-center mt-2 gap-1">
    {#each DAYS_OF_WEEK as day, index}
      {@const is_selected = days.includes(/** @type {DaysOfWeekNumbers} */ (index))}
      <button
        type="button"
        class={{
          "w-full h-12 rounded-lg border transition-colors": true,
          "border-primary bg-primary/20 text-primary": is_selected,
          "border-default bg-card": !is_selected,
        }}
        onclick={() => toggleDay(/** @type {DaysOfWeekNumbers} */ (index))}
      >
        {day}
      </button>
    {/each}
  </div>
{/if}

<Modal bind:is_open={is_dialog_open} close_button={false}>
  {#each Object.keys(interval_options) as option}
    <button
      type="button"
      class={{
        "w-full text-left border p-2 rounded-lg": true,
        "bg-primary/30 border-primary text-alt": (is_other && option === "other") || (!is_other && option === interval),
        "border-transparent": !((is_other && option === "other") || (!is_other && option === interval)),
      }}
      onclick={() => {
        if (is_other && option === "other") {
          is_dialog_open = false;
          is_other_dialog_open = true;
          return;
        }

        if (option === "other") {
          number = 2;
          interval = "daily";
          is_other_dialog_open = true;
        } else {
          number = 1;
          interval = option;
        }
        is_dialog_open = false;
      }}
    >
      {interval_options[option]}
      {option === "other" && is_other ? `(${label})`?.toLowerCase() : ""}
    </button>
  {/each}
</Modal>

<Modal bind:is_open={is_other_dialog_open} class="space-y-4" close_button={false} close_on_outside_click={false}>
  <ModalHeader>{t("repeat")} {label ? `${label}` : ` ${t("every")}…`}</ModalHeader>

  <div class="grid grid-cols-2 gap-4">
    <!-- Number slider -->
    <div class="w-full">
      <span class="font-semibold mb-2">{t("every")}</span>
      <SliderNumber bind:value={number} />
    </div>

    <!-- Interval type slider -->
    <div class="w-full">
      <span class="font-semibold mb-2">{t("period")}</span>
      <SliderInterval bind:interval />
    </div>
  </div>

  <footer class="flex justify-end">
    <button
      class="bg-primary text-alt rounded-lg h-12 px-6 flex gap-2 items-center justify-center"
      type="button"
      onclick={() => (is_other_dialog_open = false)}
    >
      <Icon name="check" />
      <span>{t("confirm")}</span>
    </button>
  </footer>
</Modal>
