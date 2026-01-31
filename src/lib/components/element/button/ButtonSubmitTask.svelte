<script>
  import { navigating } from "$app/state";
  import Icon from "$lib/components/element/Icon.svelte";
  import { t } from "$lib/services/language.svelte";

  /**
   * @typedef {Object} Props
   * @property {Readonly<boolean>} loading
   */

  /** @type {Props} */
  const { loading } = $props();
</script>

<button
  type="submit"
  class="absolute z-2 bottom-4 right-4 flex justify-center text-alt bg-primary items-center aspect-square rounded-full h-13 w-13 p-3"
  aria-label={t("create_new_item")}
  disabled={loading || !!navigating.to}
>
  {#if loading || navigating.to}
    <Icon name="loading" class="text-2xl" />
  {:else}
    <Icon name="check" class="text-2xl" />
  {/if}
</button>
