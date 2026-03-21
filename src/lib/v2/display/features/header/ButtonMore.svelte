<script>
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import Icon from "$display/comps/Icon.svelte";

  let show = $state(false);

  function toggle() {
    show = !show;
  }
</script>

<button id="meer-opsies" aria-label="More options" type="button" onclick={toggle} class="mx-2 flex justify-center items-center aspect-square rounded-full">
  <div class="bg-card rounded-full h-10 flex justify-center items-center aspect-square p-1">
    <Icon name="verticle-ellipsis" size={28} class="pointer-events-none h-full aspect-square" />
  </div>
</button>

{#if show}
  <ContextMenu bind:show />
{/if}
