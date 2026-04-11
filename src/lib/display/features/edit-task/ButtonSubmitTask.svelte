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
  class="absolute z-2 flex justify-center text-alt bg-primary items-center aspect-square rounded-full size-13 p-3"
  style="bottom: max(16px, env(safe-area-inset-bottom)); right: max(16px, env(safe-area-inset-right));"
  aria-label={t("create_new_item")}
  disabled={loading || !!navigating.to}
>
  {#if loading || navigating.to}
    <Icon name="loading" class="text-2xl" />
  {:else}
    <Icon name="check" class="text-2xl" />
  {/if}
</button>
