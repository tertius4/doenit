<script>
  import Icon from "$display/comps/Icon.svelte";

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

<button type="button" aria-label="Search tasks" class="p-2 aspect-square h-full" onclick={handleClick}>
  <div class="relative flex justify-center items-center rounded-full h-full w-full my-auto">
    <div
      class="absolute mr-1.5 w-full h-0.5 border-2 rounded-full -rotate-45 duration-200"
      class:opacity-0={!show}
      style="transform: translate({show ? 0 : -100}%, 0%);"
    ></div>

    <Icon name="search" size={28} />
  </div>
</button>
