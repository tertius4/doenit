<script>
  import { slide } from "svelte/transition";
  import t from "$display/translate";
  import DateUtil from "$display/date-util";

  /**
   * @typedef {Object} Props
   * @property {string | null} date The currently selected date in "YYYY-MM-DD" format.
   * @property {(date: string) => void} onchange Callback function to update the selected date.
   */

  /** @type {Props} */
  const { date, onchange } = $props();
</script>

{#if !date}
  {@const today = new Date()}
  {@const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))}
  {@const in_a_week = new Date(new Date().setDate(new Date().getDate() + 7))}
  {@const in_a_month = new Date(new Date().setMonth(new Date().getMonth() + 1))}

  <div class="flex gap-2 mt-2" transition:slide>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => onchange(DateUtil.format(today, "YYYY-MM-DD"))}
    >
      <span>{t("today")}</span>
      <div class="text-muted text-xs">{DateUtil.format(today, "D MMM")}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => onchange(DateUtil.format(tomorrow, "YYYY-MM-DD"))}
    >
      <span>{t("tomorrow")}</span>
      <div class="text-muted text-xs">{DateUtil.format(tomorrow, "D MMM")}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => onchange(DateUtil.format(in_a_week, "YYYY-MM-DD"))}
    >
      <span>{t("in_a_week")}</span>
      <div class="text-muted text-xs">{DateUtil.format(in_a_week, "D MMM")}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => onchange(DateUtil.format(in_a_month, "YYYY-MM-DD"))}
    >
      <span>{t("in_a_month")}</span>
      <div class="text-muted text-xs">{DateUtil.format(in_a_month, "D MMM")}</div>
    </button>
  </div>
{/if}
