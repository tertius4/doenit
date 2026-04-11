<script>
  /**
   * @typedef {Object} Props
   * @property {Date} date - The date this day represents
   * @property {boolean} is_today - Whether this is today's date
   * @property {boolean} is_other_month - Whether this date belongs to another month
   * @property {boolean} is_selected - Whether this date is selected (start or end)
   * @property {boolean} is_in_range - Whether this date is within a selected range
   * @property {boolean} is_range_start - Whether this is the start of a range
   * @property {boolean} is_range_end - Whether this is the end of a range
   * @property {(date: Date) => void} onclick - Click handler
   */

  /** @type {Props} */
  const {
    date,
    is_today = false,
    is_other_month = false,
    is_selected = false,
    is_in_range = false,
    is_range_start = false,
    is_range_end = false,
    onclick = () => {},
  } = $props();

  const getRoundedClass = () => {
    if (is_range_start && is_in_range) return "rounded-l";
    if (is_range_start && !is_in_range) return "rounded";
    if (is_range_end) return "rounded-r";
    return "rounded";
  };
</script>

<button
  class={[
    getRoundedClass(),
    "aspect-square cursor-pointer text-sm relative p-2 flex items-center justify-center",
    is_other_month && "text-muted",
    (is_today || is_selected || is_range_start || is_range_end) && "font-semibold",
    is_today && !is_selected && !is_range_start && !is_range_end && "text-alt",
    is_in_range && !is_selected && !is_range_start && !is_range_end && "bg-primary/60 text-alt",
    (is_selected || is_range_start || is_range_end) && "bg-primary text-alt",
  ]}
  onclick={() => onclick(date)}
  type="button"
>
  {date.getDate()}
  {#if is_today && !is_selected && !is_range_start && !is_range_end}
    <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
  {/if}
</button>
