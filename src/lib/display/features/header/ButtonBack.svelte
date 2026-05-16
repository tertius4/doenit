<script>
  import { navigating } from "$app/state";
  import Icon from "$display/comps/Icon.svelte";

  const { loading, onclick } = $props();
</script>

<button
  type="button"
  aria-label="Go back button"
  class="flex justify-center text-alt bg-card items-center aspect-square rounded-full size-13 p-3"
  {onclick}
  disabled={loading || !!navigating.to}
>
  {#if navigating.to}
    <Icon name="loading" class="animate-spin text-lg" />
  {:else}
    <Icon name="xmark" size={28} />
  {/if}
</button>
