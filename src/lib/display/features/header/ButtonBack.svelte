<script>
  import { navigating } from "$app/state";
  import Icon from "$display/comps/Icon.svelte";

  const { onclick } = $props();
</script>

<button type="button" aria-label="Go back button" class="p-2 aspect-square h-full" {onclick}>
  <div class="bg-card flex justify-center items-center rounded-full h-full w-full my-auto p-1">
    {#if navigating.to}
      <Icon name="loading" class="animate-spin text-lg" />
    {:else}
      <Icon name="arrow-left" size={28} />
    {/if}
  </div>
</button>
