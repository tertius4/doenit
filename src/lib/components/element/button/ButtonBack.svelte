<script>
  import { navigating, page } from "$app/state";
  import { Loading } from "$lib/icon";
  import Icon from "$lib/components/element/Icon.svelte";

  const { onclick, ...rest } = $props();

  const is_home = $derived(page.url.pathname === "/");
  const show = $derived(!["/"].includes(page.url.pathname));
</script>

{#if show}
  <button type="button" aria-label="Go back button" class="font-semibold h-full aspect-square p-1 max-h-12" {onclick}>
    <div {...rest} class={["flex justify-center items-center rounded-full aspect-square h-full", rest.class]}>
      {#if navigating.to}
        <Loading />
      {:else if !is_home}
        <Icon name="arrow-left" />
      {/if}
    </div>
  </button>
{/if}
