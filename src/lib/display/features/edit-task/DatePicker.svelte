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
  let start_time = $state("");
  /** @type {string | undefined} */
  let end_time = $state("");

  let is_open = $state(false);

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

<div class="border border-default h-12 bg-card rounded-lg w-full flex">
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
        start = end = "";
      }}
    />
  {/if}
</div>

<Modal bind:is_open close_button={false} class="*:space-y-2">
  <ModalHeader>{t("datepicker_choose_start_and_end_date")}</ModalHeader>
  <div>
    <Calendar is_range_enabled={enable_range} bind:start_date bind:end_date ondateselected={handleSelection} />
  </div>

  <div class="flex items-center gap-2">
    <InputTime value={start_time} onchange={(value) => (start_time = value)} placeholder={t("choose_start_time")} />
    <InputTime value={end_time} onchange={(value) => (end_time = value)} placeholder={t("choose_end_time")} />
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
