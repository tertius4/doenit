<script>
  import Icon from "$display/comps/Icon.svelte";
  import { navigating } from "$app/state";

  /**
   * @typedef {Object} Props
   * @property {boolean} [loading] - Whether the task is currently being saved.
   * @property {() => *} onclick - The function to call when the back button is clicked.
   */

  /** @type {Props} */
  const { loading = false, onclick } = $props();
</script>

<button
  type="button"
  aria-label="Go back button"
  class="flex justify-center text-alt bg-card items-center aspect-square rounded-full size-10 p-2"
  {onclick}
  disabled={loading || !!navigating.to}
>
  {#if loading || !!navigating.to}
    <Icon name="loading" class="animate-spin text-lg" />
  {:else}
    <Icon name="arrow-left" size={28} />
  {/if}
</button>
