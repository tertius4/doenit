<script>
  import Slider from "$display/comps/input/Slider.svelte";
  import { untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {Domain.Task['repeat_interval_number']} value - The current value of the repeat option
   */

  /** @type {Props} */
  let { value = $bindable() } = $props();

  let temp_value = $state("" + value);

  const MIN_CUSTOM_INTERVAL = 2;
  const MAX_CUSTOM_INTERVAL = 500;

  /** @type {string[]} */
  const NUMBER_OPTIONS = $derived(
    Array.from({ length: MAX_CUSTOM_INTERVAL - MIN_CUSTOM_INTERVAL + 1 }, (_, i) => "" + (i + MIN_CUSTOM_INTERVAL)),
  );

  $effect(() => {
    temp_value;
    untrack(() => {
      value = +temp_value;
    });
  });
</script>

<Slider options={NUMBER_OPTIONS} bind:value={temp_value} />
