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

<button
  type="button"
  aria-label="Search tasks"
  class="shrink-0 size-10 flex items-center justify-center outline-none"
  onclick={handleClick}
>
  <div class="relative size-7 flex items-center justify-center">
    <div
      class="absolute left-0 right-0 h-px border-t-4 rounded-full -rotate-45 duration-200"
      class:opacity-0={!show}
      style="transform: translate({show ? 0 : 100}%, 0%);"
    ></div>

    <Icon name="search" size={28} />
  </div>
</button>
