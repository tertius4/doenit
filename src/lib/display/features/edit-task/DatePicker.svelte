<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import { onMount, untrack } from "svelte";
  import t from "$display/translate";
  import { Calendar } from "./calendar";

  import DateUtil from "$display/date-util";
  import InputTime from "$display/comps/input/InputTime.svelte";
  import Button from "$display/comps/button/Button.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { context } from "$logic/context.svelte";
  import { slide } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @property {string?} start - Selected start date string
   * @property {string?} end - Selected end date string
   */

  /** @type {Props} */
  let { start = $bindable(), end = $bindable() } = $props();

  let is_mounted = false;
  let enable_range = $state(!!end);

  // Internal selection state
  let start_date = $state(start ? new Date(start) : null);
  let end_date = $state(end ? new Date(end) : null);

  /** @type {string | undefined} */
  let start_time = $state(start?.split(" ")[1] ?? "");
  /** @type {string | undefined} */
  let end_time = $state(end?.split(" ")[1] ?? "");

  let is_open = $state(false);

  const display_end = $derived(end_date ? DateUtil.format(end_date, "D MMM YYYY") : null);
  const display_start = $derived(start_date ? DateUtil.format(start_date, "D MMM YYYY") : null);
  const display_start_time = $derived(start?.split(" ")[1] ?? "");
  const display_end_time = $derived(end?.split(" ")[1] ?? "");

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
   * Handle date selection from Calendar
   * @param {{ start_date: Date, start_time?: string | null, end_date?: Date | null, end_time?: string | null }} update
   */
  function handleSelection(update) {
    console.log("Date selection updated:", update);
    if (update.start_time !== undefined) {
      if (update.start_time !== null && !/^\d{2}:\d{2}$/.test(update.start_time)) {
        console.error(`Tyd in verkeerde formaat: ${update.start_time}. Moet in HH:mm formaat wees.`);
        return;
      }
      start_time = update.start_time ?? "";
      start = `${DateUtil.format(update.start_date, "YYYY-MM-DD")} ${update.start_time ?? ""}`.trim();
    }

    if (update.end_time !== undefined) {
      if (update.end_time !== null && !/^\d{2}:\d{2}$/.test(update.end_time)) {
        console.error(`Tyd in verkeerde formaat: ${update.end_time}. Moet in HH:mm formaat wees.`);
        return;
      }

      end_time = update.end_time ?? "";
      end = `${DateUtil.format(update.end_date, "YYYY-MM-DD")} ${update.end_time ?? ""}`.trim();
    }
  }
</script>

<div class="border border-default h-12 bg-card rounded-lg w-full flex">
  <button type="button" onclick={() => (is_open = !is_open)} class="w-full flex items-center justify-between p-2">
    {#if !start_date && !end_date}
      <span class="text-muted">{t("datepicker_choose_dates")}</span>
    {:else if start_date && !end_date}
      <span>{display_start} {display_start_time}</span>
    {:else if start_date && end_date}
      <span>{display_start}</span>
      <span> {t("to")} </span>
      <span>{display_end} {display_end_time}</span>
    {/if}
  </button>

  {#if start_date}
    <ButtonClear
      onclick={() => {
        start = end = "";
      }}
    />
  {/if}
</div>

<Modal bind:is_open close_button={false} class="*:space-y-2">
  <ModalHeader>{t("datepicker_choose_start_and_end_date")}</ModalHeader>
  <div>
    <Calendar
      is_range_enabled={enable_range}
      bind:start_date
      bind:end_date
      locale={context.settings.language}
      ondateselected={handleSelection}
    />
  </div>

  <div class="flex items-center gap-2">
    {#if start_date}
      <div transition:slide class="w-full">
        <InputTime
          class="w-full"
          value={start_time}
          onchange={(value) => handleSelection({ end_date, start_date, start_time: value ?? null })}
          placeholder={t("choose_start_time")}
        />
      </div>
    {/if}

    {#if end_date}
      <div transition:slide class="w-full">
        <InputTime
          class="w-full"
          value={end_time}
          onchange={(value) => handleSelection({ end_date, start_date, end_time: value ?? null })}
          placeholder={t("choose_end_time")}
        />
      </div>
    {/if}
  </div>

  <Button
    class="bg-card"
    onclick={() => {
      is_open = false;
      enable_range = false;
    }}
  >
    <Icon name="check" />
    <span>{t("confirm")}</span>
  </Button>
</Modal>
