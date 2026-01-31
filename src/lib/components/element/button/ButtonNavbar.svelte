<script>
  import Navbar from "$lib/components/Navbar.svelte";
  import Icon from "$lib/components/element/Icon.svelte";

  let is_open = $state(false);
</script>

<button
  type="button"
  aria-label="Menu"
  class="flex justify-center items-center rounded-md aspect-square h-15 w-15 bg-card p-2"
  onclick={() => (is_open = !is_open)}
>
  <Icon name="burger" class="text-2xl" />
</button>

{#if is_open}
  <Navbar onclose={() => (is_open = false)} />
{/if}
