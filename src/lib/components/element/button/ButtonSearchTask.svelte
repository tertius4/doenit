<script>
  import Icon from "$lib/components/element/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} [show=false] - Indicates if the search bar is shown.
   */

  /** @type {Props} */
  let { show = $bindable() } = $props();

  function handleClick() {
    show = !show;
  }
</script>

<button
  class="h-full relative aspect-square flex justify-center items-center overflow-hidden"
  onclick={handleClick}
  type="button"
  aria-label="Search tasks"
>
  <!-- Improved slash -->
  <div
    class="absolute mr-1.5 w-2/3 h-0.5 border-2 rounded-full -rotate-45 duration-200"
    class:opacity-0={!show}
    style="transform: translate({show ? 0 : 100}%, 0%);"
  ></div>

  <Icon name="search" class="text-3xl" />
</button>
