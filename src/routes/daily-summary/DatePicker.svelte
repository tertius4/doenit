<script>
  import Icon from "$lib/components/element/Icon.svelte";
  import { DateUtil } from "$lib/core/date_util";
  import { ArrowLeft, ArrowRight } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";

  /**
   * @typedef {Object} Props
   * @property {Date} [date]
   * @property {(date: Date) => Promise<void> | void} ondatechange
   */

  /** @type {Props} */
  const { date: original_date = new Date(), ondatechange } = $props();

  let selected_date = $state(new Date(original_date));

  const is_today = $derived(DateUtil.isSameDay(new Date(), selected_date));
  /**
   *
   * @param {Date} date
   */
  function formatDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (today.getTime() === target.getTime()) {
      return t("today");
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getTime() === target.getTime()) {
      return t("yesterday");
    }

    return DateUtil.format(target, "ddd, D MMM YYYY");
  }

  /**
   *
   * @param {number} days
   */
  async function changeDate(days) {
    const new_date = new Date(selected_date);
    new_date.setDate(new_date.getDate() + days);
    selected_date = new_date;
    await ondatechange(selected_date);
  }
</script>

<!-- Header with date navigation -->
<header class="flex items-center justify-between gap-4 sticky bg-page z-10 -mt-1 pt-2 pb-4">
  <button
    type="button"
    onclick={() => changeDate(-1)}
    class="px-4 py-2 bg-surface rounded-lg"
    aria-label={t("previous_day")}
  >
    <Icon name="arrow-left" class="w-4 h-4" />
  </button>

  <div class="flex-1 text-center">
    <h2 class="text-xl font-bold">{formatDate(selected_date)}</h2>
  </div>

  <button
    type="button"
    onclick={() => changeDate(1)}
    disabled={is_today}
    class="px-4 py-2 bg-surface rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label={t("next_day")}
  >
    <Icon name="arrow-right" class="w-4 h-4" />
  </button>
</header>
