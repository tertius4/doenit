<script>
  import { navigating } from "$app/state";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @property {Readonly<boolean>} loading
   */

  /** @type {Props} */
  const { loading } = $props();
</script>

<button
  type="submit"
  class="flex justify-center text-alt bg-secondary-500 items-center aspect-square rounded-full size-13 p-3"
  aria-label={t("create_new_item")}
  disabled={loading || !!navigating.to}
>
  {#if loading || navigating.to}
    <Icon name="loading" class="text-2xl" />
  {:else}
    <Icon name="check" class="text-2xl" />
  {/if}
</button>
