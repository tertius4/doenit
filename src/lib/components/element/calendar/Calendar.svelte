<script>
  import { slide } from "svelte/transition";
  import CalendarMonth from "./CalendarMonth.svelte";
  import ChevronLeft from "$lib/icon/ChevronLeft.svelte";
  import ChevronRight from "$lib/icon/ChevronRight.svelte";
  import DownChevron from "$lib/icon/DownChevron.svelte";
  import { t } from "$lib/services/language.svelte";
  import { untrack } from "svelte";
  import { DateUtil } from "$lib/core/date_util";

  /**
   * @typedef {Object} Props
   * @property {Date | null} start_date - Initial/controlled start date
   * @property {Date | null} end_date - Initial/controlled end date
   * @property {string} [locale] - Locale for formatting (default: 'en-US')
   * @property {boolean} [is_range_enabled] - Whether date range selection is enabled (default: true)
   * @property {number} [week_starts_on] - 0 for Sunday, 1 for Monday (default: 1)
   * @property {Function} ondateselected - Callback when dates are selected: ({ start_date, end_date }) => void
   */

  /** @type {Props} */
  let {
    start_date = $bindable(null),
    end_date = $bindable(null),
    locale = "af-ZA",
    week_starts_on = 0,
    is_range_enabled = true,
    ondateselected = null,
  } = $props();

  // Current month being viewed
  let current_month = $state(start_date || goToToday());

  // Internal selection state
  let internal_start_date = $state(start_date);
  let internal_end_date = $state(end_date);

  // Sync with props
  $effect(() => {
    start_date;
    end_date;

    untrack(() => {
      internal_start_date = start_date;
      internal_end_date = end_date;
    });
  });

  // Month/year navigation state
  let is_year_picker_open = $state(false);
  let is_month_picker_open = $state(false);

  const month_names = $derived.by(() => {
    const names = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(2025, i, 1);
      names.push(date.toLocaleDateString(locale, { month: "long" }));
    }
    return names;
  });

  const current_month_name = $derived(current_month.toLocaleDateString(locale, { month: "long", year: "numeric" }));

  function previousMonth() {
    const newMonth = new Date(current_month);
    newMonth.setMonth(newMonth.getMonth() - 1);
    current_month = newMonth;
  }

  function nextMonth() {
    const newMonth = new Date(current_month);
    newMonth.setMonth(newMonth.getMonth() + 1);
    current_month = newMonth;
  }

  function goToToday() {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);

    return date;
  }

  function selectMonth(index) {
    const newMonth = new Date(current_month);
    newMonth.setMonth(index);
    current_month = newMonth;
    is_month_picker_open = false;
  }

  function selectYear(year) {
    const newMonth = new Date(current_month);
    newMonth.setFullYear(year);
    current_month = newMonth;
    is_year_picker_open = false;
  }

  function handleDayClick(date) {
    const clicked_date = new Date(date);
    clicked_date.setHours(0, 0, 0, 0);

    // Date range selection logic
    const same_day = DateUtil.isSameDay(internal_start_date, clicked_date);
    if (!is_range_enabled || !internal_start_date || (internal_start_date && internal_end_date) || same_day) {
      // Start new selection
      internal_start_date = clicked_date;
      internal_end_date = null;
    } else if (internal_start_date && !internal_end_date) {
      // Complete the range
      if (clicked_date < internal_start_date) {
        // Clicked date is before start, swap them
        internal_end_date = internal_start_date;
        internal_start_date = clicked_date;
      } else if (clicked_date.getTime() === internal_start_date.getTime()) {
        // Clicked same date, keep only start date
        internal_end_date = null;
      } else {
        // Clicked date is after start
        internal_end_date = clicked_date;
      }
    }

    // Update bindable props
    start_date = internal_start_date;
    end_date = internal_end_date;

    // Emit event
    if (ondateselected) {
      ondateselected({
        start_date: internal_start_date,
        end_date: internal_end_date,
      });
    }
  }

  // Generate year range for year picker
  const year_range = $derived.by(() => {
    const current_year = current_month.getFullYear();
    const years = [];
    for (let i = current_year - 10; i <= current_year + 10; i++) {
      years.push(i);
    }
    return years;
  });
</script>

<div class="w-full bg-surface rounded-lg">
  <div class="flex items-center justify-between mb-4 gap-1">
    <button
      class="cursor-pointer p-2 rounded flex items-center justify-center text-muted"
      aria-label="Previous month"
      onclick={previousMonth}
      type="button"
    >
      <ChevronLeft class="w-5 h-5" />
    </button>

    <div class="flex items-center flex-1 justify-between">
      <button
        class="cursor-pointer px-3 py-2 rounded-lg text-base font-semibold flex items-center gap-2"
        onclick={() => {
          is_month_picker_open = !is_month_picker_open;
          if (!is_month_picker_open) {
            is_year_picker_open = false;
          }
        }}
        type="button"
      >
        {current_month_name}
        <DownChevron class="w-4 h-4 {is_month_picker_open ? 'rotate-180' : ''}" />
      </button>

      {#if DateUtil.format(current_month, "MM-YYYY") !== DateUtil.format(goToToday(), "MM-YYYY")}
        <button
          class="bg-card border border-default cursor-pointer px-3 py-1.5 rounded text-sm"
          onclick={() => {
            current_month = goToToday();
          }}
          type="button"
        >
          {t("today")}
        </button>
      {/if}
    </div>

    <button
      class="border-none cursor-pointer p-2 rounded-lg flex items-center justify-center text-muted"
      aria-label="Next month"
      onclick={nextMonth}
      type="button"
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>

  <div class="relative">
    {#if is_month_picker_open}
      <div
        class="mb-4 border absolute z-10 top-0 left-0 right-0 border-default rounded-md p-3 bg-page"
        transition:slide={{ duration: 200 }}
      >
        <div class="grid grid-cols-3 gap-2 mb-2">
          {#each month_names as month, index}
            {@const is_selected = current_month.getMonth() === index}
            <button
              class={{
                "border cursor-pointer p-2 rounded text-sm transition-all duration-150 flex items-center justify-center": true,
                "bg-primary/20 border-primary text-alt": is_selected,
                "bg-card border-default text-normal": !is_selected,
              }}
              onclick={() => selectMonth(index)}
              type="button"
            >
              {month}
            </button>
          {/each}
        </div>
        <div class="flex justify-center">
          <button
            class="bg-card border border-default cursor-pointer p-2 rounded text-sm transition-all duration-150 flex items-center justify-center gap-1"
            onclick={() => {
              is_year_picker_open = !is_year_picker_open;
            }}
            type="button"
          >
            {current_month.getFullYear()}
            <DownChevron class="w-4 h-4 transition-transform duration-200 {is_year_picker_open ? 'rotate-180' : ''}" />
          </button>
        </div>
      </div>
    {/if}

    {#if is_year_picker_open}
      <div
        class="mb-4 border absolute z-10 top-0 left-0 right-0 border-default rounded-md p-3 bg-page"
        transition:slide={{ duration: 200 }}
      >
        <div class="grid grid-cols-3 gap-2 mb-2">
          {#each year_range as year}
            {@const is_selected = current_month.getFullYear() === year}
            <button
              class={{
                "border cursor-pointer p-2 rounded text-sm transition-all duration-150 flex items-center justify-center": true,
                "bg-primary/20 border-primary text-alt": is_selected,
                "bg-card border-default text-normal": !is_selected,
              }}
              onclick={() => selectYear(year)}
              type="button"
            >
              {year}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div>
      <CalendarMonth
        {current_month}
        start_date={internal_start_date}
        end_date={internal_end_date}
        {locale}
        {week_starts_on}
        ondayclick={handleDayClick}
      />
    </div>
  </div>
</div>
