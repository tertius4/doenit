<script>
  import { untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {string[]} options - List of options to display
   * @property {string} value - Currently selected value
   * @property {(val: string) => void} [onchange] - Callback when the selected value changes
   */

  /** @type {Props & Record<string, any>} */
  let { options = [], value = $bindable(""), onchange, ...rest } = $props();

  const item_height = 32;
  const visible_items = 3;
  const total_repeats = 5;

  /** @type {HTMLDivElement | null} */
  let scroll_container = $state(null);
  let is_scrolling = false;
  /** @type {NodeJS.Timeout | Number} */
  let scroll_timeout = 0;

  const all_options = [...options.slice(-1), ...Array(total_repeats).fill(options).flat(), ...options.slice(0, 1)];

  $effect(() => {
    if (!scroll_container || options.length === 0) return;

    untrack(() => {
      if (!scroll_container) return;

      const selected_index = options.indexOf(value);
      if (selected_index === -1) return;

      const middle_repeat = Math.floor(total_repeats / 2);
      const scroll = (middle_repeat * options.length + selected_index + 1) * item_height;
      scroll_container.scrollTop = scroll;
    });
  });

  function handleScroll() {
    is_scrolling = true;
    clearTimeout(scroll_timeout);

    scroll_timeout = setTimeout(() => {
      snapToNearest();
      is_scrolling = false;
    }, 150);
  }

  function snapToNearest() {
    if (!scroll_container) return;

    const scrollTop = scroll_container.scrollTop;
    const nearestIndex = Math.round(scrollTop / item_height);
    const snappedScroll = nearestIndex * item_height;

    scroll_container.scrollTo({
      top: snappedScroll,
      behavior: "smooth",
    });

    const selected_option = all_options[nearestIndex];
    if (selected_option !== value) {
      value = selected_option;
      onchange?.(selected_option); // Add this line
    }

    handleInfiniteScroll(nearestIndex);
  }

  /**
   * @param {number} index
   */
  function handleInfiniteScroll(index) {
    if (!scroll_container) return;

    const middle_repeat = Math.floor(total_repeats / 2);
    const middle_start = middle_repeat * options.length + 1;
    const middle_end = (middle_repeat + 1) * options.length;

    if (index < middle_start - 5) {
      const offset = options.length * item_height;
      scroll_container.scrollTop += offset;
    } else if (index > middle_end + 5) {
      const offset = options.length * item_height;
      scroll_container.scrollTop -= offset;
    }
  }
</script>

<div class={["relative w-full", rest.class || ""]} style="height: {item_height * visible_items}px;">
  <!-- Selection indicator -->
  <div
    class="absolute left-0 right-0 pointer-events-none z-10 border-y border-default"
    style="top: {item_height}px; height: {item_height}px;"
  ></div>

  <!-- Scroll container -->
  <div
    bind:this={scroll_container}
    onscroll={handleScroll}
    class="h-full overflow-y-scroll scrollbar-none"
    style="scroll-snap-type: y mandatory;"
  >
    <div style="padding: {item_height}px 0;">
      {#each all_options as option}
        {@const is_center = option === value}

        <div
          class="flex items-center justify-center transition-opacity duration-200"
          class:opacity-30={!is_center}
          style="height: {item_height}px; scroll-snap-align: center;"
        >
          <span class="text-md font-medium">
            {option}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>
