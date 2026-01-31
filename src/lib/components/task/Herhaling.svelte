<script>
  import { untrack } from "svelte";
  import Modal from "../modal/Modal.svelte";
  import { slide } from "svelte/transition";
  import Icon from "$lib/components/element/Icon.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import ButtonClear from "../element/button/ButtonClear.svelte";
  import { t } from "$lib/services/language.svelte";
  import Slider from "../Slider.svelte";

  /**
   * @typedef {Object} Props
   * @property {number} repeat_interval_number - The number of intervals for the repeat.
   * @property {(0|1|2|3|4|5|6)[]} specific_days - The specific days of the week for weekly repetition.
   * @property {string} repeat_interval - The type of repeat interval (daily, weekly, monthly, yearly).
   * @property {string} other_interval - The custom interval if the repeat interval is set to "other".
   */

  /** @type {Props} */
  let {
    repeat_interval_number = $bindable(),
    repeat_interval = $bindable(),
    other_interval = $bindable(),
    specific_days = $bindable([]),
  } = $props();

  // Constants
  const MIN_CUSTOM_INTERVAL = 2;
  const MAX_CUSTOM_INTERVAL = 500;

  /** @type {string[]} */
  const NUMBER_OPTIONS = $derived(
    Array.from({ length: MAX_CUSTOM_INTERVAL - MIN_CUSTOM_INTERVAL + 1 }, (_, i) => String(i + MIN_CUSTOM_INTERVAL))
  );

  /** @type {string[]} */
  const INTERVAL_TYPE_OPTIONS = $derived([t("days"), t("weeks"), t("months"), t("years")]);

  /** @type {Record<string, string>} */
  const INTERVAL_TYPE_MAP = $derived({
    [t("days")]: "daily",
    [t("weeks")]: "weekly",
    [t("months")]: "monthly",
    [t("years")]: "yearly",
  });

  /** @type {Record<string, string>} */
  const REVERSE_INTERVAL_MAP = $derived({
    daily: t("days"),
    weekly: t("weeks"),
    monthly: t("months"),
    yearly: t("years"),
  });

  /** @type {string[]} */
  const DAYS_OF_WEEK = $derived([t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")]);

  // Local state
  let is_mounting = $state(true);
  let temp_repeat_interval = $state(repeat_interval_number > 1 ? "other" : repeat_interval);
  /** @type {Set<number>} */
  let temp_specific_days = $state(new SvelteSet(specific_days));
  let is_dialog_open = $state(false);

  // Slider values (as strings for the Slider component)
  let temp_number_value = $state(String(Math.max(MIN_CUSTOM_INTERVAL, repeat_interval_number)));
  let temp_interval_value = $state(REVERSE_INTERVAL_MAP[other_interval] || t("days"));

  // Computed display text
  const display_other = $derived.by(() => {
    if (!other_interval || repeat_interval_number < MIN_CUSTOM_INTERVAL) return "";
    return ` (${t("every")} ${repeat_interval_number} ${REVERSE_INTERVAL_MAP[other_interval]})`;
  });

  const temp_display_other = $derived.by(() => {
    const num = parseInt(temp_number_value);
    if (isNaN(num) || num < MIN_CUSTOM_INTERVAL) return "";
    return ` ${t("every")} ${temp_number_value} ${temp_interval_value}`;
  });

  // Handle repeat interval changes
  $effect(() => {
    temp_repeat_interval;
    untrack(() => {
      if (is_mounting) {
        is_mounting = false;
        return;
      }

      if (temp_repeat_interval === "other_temp") {
        temp_repeat_interval = "other";
      } else if (temp_repeat_interval === "other") {
        is_dialog_open = true;
        temp_number_value = String(Math.max(MIN_CUSTOM_INTERVAL, repeat_interval_number));
        temp_interval_value = REVERSE_INTERVAL_MAP[other_interval] || t("days");
      } else {
        other_interval = "";
        repeat_interval_number = 1;
      }
    });
  });

  // Sync repeat_interval
  $effect(() => {
    if (temp_repeat_interval !== "other" || !!INTERVAL_TYPE_MAP[temp_interval_value]) {
      untrack(() => {
        repeat_interval = temp_repeat_interval;
      });
    }
  });

  // Reset dialog values when closed
  $effect(() => {
    if (!is_dialog_open) {
      untrack(() => {
        temp_repeat_interval = repeat_interval;
        temp_number_value = String(Math.max(MIN_CUSTOM_INTERVAL, repeat_interval_number));
        temp_interval_value = REVERSE_INTERVAL_MAP[other_interval] || t("days");
      });
    }
  });

  // Sync specific days
  $effect(() => {
    if (temp_repeat_interval === "weekly_custom_days") {
      specific_days = [...temp_specific_days];
    } else {
      specific_days = [];
    }
  });

  function save() {
    const num = parseInt(temp_number_value);
    const interval_key = INTERVAL_TYPE_MAP[temp_interval_value];

    if (isNaN(num) || num < MIN_CUSTOM_INTERVAL) {
      return;
    }

    if (!interval_key) {
      return;
    }

    repeat_interval_number = num;
    repeat_interval = "other";
    other_interval = interval_key;

    is_dialog_open = false;
  }

  function clearRepeat() {
    temp_repeat_interval = "";
    temp_specific_days.clear();
  }

  /**
   * 
   * @param {number} index
   */
  function toggleDay(index) {
    if (temp_specific_days.has(index)) {
      temp_specific_days.delete(index);
    } else {
      temp_specific_days.add(index);
    }
  }
</script>

<div class="relative">
  <select
    id="repeat"
    bind:value={temp_repeat_interval}
    class="bg-card border border-default p-2 w-full rounded-lg placeholder:text-muted appearance-none outline-none"
    class:text-normal={temp_repeat_interval}
    class:text-muted={!temp_repeat_interval}
  >
    <option value="">{t("no_repeat")}</option>
    <option value="daily">{t("daily")}</option>
    <option value="workdaily">{t("daily_workdays")}</option>
    <option value="weekly_custom_days">{t("weekly_custom")}</option>
    <option value="weekly">{t("weekly")}</option>
    <option value="monthly">{t("monthly")}</option>
    <option value="yearly">{t("yearly")}</option>
    <option hidden={temp_repeat_interval === "other"} value="other">
      {t("other")}{display_other}
    </option>
    <option hidden={temp_repeat_interval !== "other"} value="other_temp">
      {t("other")}{display_other}
    </option>
  </select>

  {#if temp_repeat_interval}
    <ButtonClear onclick={clearRepeat} class="absolute right-0 top-0 bottom-0" />
  {/if}
</div>

{#if temp_repeat_interval === "weekly_custom_days"}
  <div transition:slide class="flex justify-between items-center mt-2 gap-1">
    {#each DAYS_OF_WEEK as day, index}
      {@const is_selected = temp_specific_days.has(index)}
      <button
        type="button"
        class={{
          "w-full h-12 rounded-lg border transition-colors": true,
          "border-primary bg-primary/20 text-primary": is_selected,
          "border-default bg-card": !is_selected,
        }}
        onclick={() => toggleDay(index)}
      >
        {day}
      </button>
    {/each}
  </div>
{/if}

<Modal bind:is_open={is_dialog_open} class="space-y-4">
  <h2 class="text-lg font-bold">
    {t("repeat")}{temp_display_other || ` ${t("every")}…`}
  </h2>

  <div class="grid grid-cols-2 gap-4">
    <!-- Number slider -->
    <div class="w-full">
      <span class="font-semibold mb-2">{t("every")}</span>
      <Slider options={NUMBER_OPTIONS} bind:value={temp_number_value} />
    </div>

    <!-- Interval type slider -->
    <div class="w-full">
      <span class="font-semibold mb-2">{t("period")}</span>
      <Slider options={INTERVAL_TYPE_OPTIONS} bind:value={temp_interval_value} />
    </div>
  </div>

  <footer class="flex justify-end">
    <button
      class="bg-primary text-alt rounded-lg h-12 px-6 flex gap-2 items-center justify-center"
      type="button"
      onclick={save}
    >
      <Icon name="check" />
      <span>{t("confirm")}</span>
    </button>
  </footer>
</Modal>
