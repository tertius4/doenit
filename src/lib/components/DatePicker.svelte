<script>
  import Modal from "./modal/Modal.svelte";
  import Calendar from "./element/calendar/Calendar.svelte";
  import Slider from "./Slider.svelte";
  import { slide } from "svelte/transition";
  import { DateUtil } from "$lib/core/date_util";
  import Button from "./element/button/Button.svelte";
  import { Check } from "$lib/icon";
  import { onMount, untrack } from "svelte";
  import { t } from "$lib/services/language.svelte";
  import ButtonClear from "./element/button/ButtonClear.svelte";

  /**
   * @typedef {Object} Props
   * @property {string?} start - Selected start date string
   * @property {string?} end - Selected end date string
   */

  /** @type {Props} */
  let { start = $bindable(), end = $bindable() } = $props();

  const DEFAULT_HOUR = "08";
  const DEFAULT_MIN = "00";

  let is_mounted = false;
  let enable_range = !!end;

  // Internal selection state
  let start_date = $state(start ? new Date(start) : null);
  let end_date = $state(end ? new Date(end) : null);
  let start_hour = $state(initStartHour(start));
  let start_min = $state(initStartMinute(start));

  let is_open = $state(false);

  const is_time_picked = $derived(start?.includes(" "));
  const display_end = $derived(end_date ? DateUtil.format(end_date, "D MMM YYYY") : null);
  const display_start = $derived(start_date ? DateUtil.format(start_date, "D MMM YYYY") : null);
  const display_time = $derived(start?.split(" ")[1] ?? "");

  $effect(() => {
    start;
    end;

    untrack(() => {
      start_date = start ? new Date(start) : null;
      end_date = end ? new Date(end) : null;
    });
  });

  $effect(() => {
    start_date;

    if (!is_mounted) return;
    enable_range = true;
  });

  onMount(() => (is_mounted = true));

  /**
   * @param {string | null} start_date_str
   */
  function initStartHour(start_date_str) {
    if (!start_date_str?.includes(" ")) return DEFAULT_HOUR;

    const time = start_date_str.split(" ")[1].split(":")[0];
    return time ?? DEFAULT_HOUR;
  }

  /**
   * @param {string | null} start_date_str
   */
  function initStartMinute(start_date_str) {
    if (!start_date_str?.includes(" ")) return DEFAULT_MIN;

    const time = start_date_str.split(" ")[1].split(":")[1];
    return time ?? DEFAULT_MIN;
  }

  /**
   * Handle date selection from Calendar
   * @param {{ start_date: Date, start_time?: string, end_date?: Date | null }} update
   */
  function handleSelection(update) {
    if (update.start_time) {
      if (!/^\d{2}:\d{2}$/.test(update.start_time)) {
        console.error(`Tyd in verkeerde formaat: ${update.start_time}. Moet in HH:mm formaat wees.`);
        return;
      }
      start = `${DateUtil.format(update.start_date, "YYYY-MM-DD")} ${update.start_time}`;
      end = null;
    } else {
      start = DateUtil.format(update.start_date, "YYYY-MM-DD");
      end = update.end_date ? DateUtil.format(update.end_date, "YYYY-MM-DD") : null;
    }
  }
</script>

<div class="border border-default h-11 bg-card rounded-lg w-full flex">
  <button type="button" onclick={() => (is_open = !is_open)} class="w-full flex items-center justify-between p-2">
    {#if !start_date && !end_date}
      <span class="text-muted">{t("datepicker_choose_dates")}</span>
    {:else if start_date && !end_date}
      <span>{display_start} {display_time}</span>
    {:else if start_date && end_date}
      <span>{display_start}</span>
      <span> {t("to")} </span>
      <span>{display_end}</span>
    {/if}
  </button>

  {#if start_date}
    <ButtonClear
      onclick={() => {
        start_hour = start_min = "";
        start = end = "";
      }}
    />
  {/if}
</div>

<Modal bind:is_open onclose={() => (enable_range = false)} close_button={false}>
  <h1 class="mx-auto w-fit font-semibold py-2 text-lg">{t("datepicker_choose_start_and_end_date")}</h1>
  <div class="mb-2">
    <Calendar is_range_enabled={enable_range} bind:start_date bind:end_date ondateselected={handleSelection} />
  </div>

  {#if !end_date}
    <h1 class="mx-auto w-fit font-semibold py-2 text-lg">{t("datepicker_choose_start_time")}</h1>
    <div transition:slide={{ axis: "y" }} class="flex gap-2 w-full mb-2">
      <div class="w-full text-center">
        <span class={{ "font-semibold": true, "opacity-50": !is_time_picked }}>{t("datepicker_hour")}</span>
        <Slider
          class={{ "opacity-50": !is_time_picked }}
          options={Array.from({ length: 24 }).map((_, i) => `${i}`.padStart(2, "0"))}
          bind:value={start_hour}
          onchange={() => {
            if (!start_date) return;
            const start_time = `${start_hour}:${start_min}`;
            handleSelection({ start_date, start_time });
          }}
        />
      </div>
      <div class="w-full text-center">
        <span class={{ "font-semibold": true, "opacity-50": !is_time_picked }}>{t("datepicker_minute")}</span>
        <Slider
          class={{ "opacity-50": !is_time_picked }}
          options={Array.from({ length: 60 }).map((_, i) => `${i}`.padStart(2, "0"))}
          bind:value={start_min}
          onchange={() => {
            if (!start_date) return;
            const start_time = `${start_hour}:${start_min}`;
            handleSelection({ start_date, start_time });
          }}
        />
      </div>
    </div>
  {/if}

  <Button
    class="bg-card"
    onclick={() => {
      is_open = false;
      enable_range = false;
    }}
  >
    <Check />
    <span>{t("confirm")}</span>
  </Button>
</Modal>
