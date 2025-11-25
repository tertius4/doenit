<script>
  import CalendarDay from "./CalendarDay.svelte";
  import { DateUtil } from "$lib/core/date_util.js";

  /**
   * @typedef {Object} Props
   * @property {Date} current_month - The month to display
   * @property {Date | null} start_date - Selected start date
   * @property {Date | null} end_date - Selected end date
   * @property {string} locale - Locale for day/month names
   * @property {number} week_starts_on - 0 for Sunday, 1 for Monday
   * @property {Function} ondayclick - Handler when a day is clicked
   */

  /** @type {Props} */
  let {
    current_month,
    start_date = null,
    end_date = null,
    locale = "af-ZA",
    week_starts_on = 0,
    ondayclick = () => {},
  } = $props();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate day headers based on locale and week start
  const dayHeaders = $derived.by(() => {
    const headers = [];
    const baseDate = new Date(2025, 1, week_starts_on === 0 ? 2 : 3); // Jan 4/5, 2025 is a Sat/Sun

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      headers.push(date.toLocaleDateString(locale, { weekday: "short" }));
    }
    return headers;
  });

  // Generate calendar days
  const calendarDays = $derived.by(() => {
    const year = current_month.getFullYear();
    const month = current_month.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    let firstDayOfWeek = firstDay.getDay();

    // Adjust for week start day
    if (week_starts_on === 1) {
      firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    }

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0);
    const daysFromPrevMonth = firstDayOfWeek;

    const days = [];

    // Add previous month days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
      days.push({ date, isOtherMonth: true });
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isOtherMonth: false });
    }

    // Add next month days to complete the grid (6 weeks max)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isOtherMonth: true });
    }

    return days;
  });
</script>

<div class="w-full">
  <div class="grid grid-cols-7 gap-1 mb-2">
    {#each dayHeaders as name}
      <div class="text-center text-xs font-semibold p-2 uppercase">{name}</div>
    {/each}
  </div>

  <div class="grid grid-cols-7 gap-1">
    {#each calendarDays as { date, isOtherMonth }}
      <CalendarDay
        {date}
        is_today={DateUtil.isSameDay(date, today)}
        is_other_month={isOtherMonth}
        is_selected={DateUtil.isSameDay(date, start_date) || DateUtil.isSameDay(date, end_date)}
        is_in_range={DateUtil.isDateInRange(date, start_date, end_date)}
        is_range_start={DateUtil.isSameDay(date, start_date)}
        is_range_end={DateUtil.isSameDay(date, end_date)}
        onclick={ondayclick}
      />
    {/each}
  </div>
</div>
