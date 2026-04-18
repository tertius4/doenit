<script>
  import Icon from "$display/comps/Icon.svelte";
  import { navigating, page } from "$app/state";
  import { goto } from "$app/navigation";

  /**
   * @typedef {Object} Props
   */

  /** @type {Props & Record<string, any>} */
  const { ...rest } = $props();

  /** @type {Record<string, string>}*/
  const ICON_CHART = {
    // "/(main)": "plus",
    // "/(main)/create": "check",
    // "/(main)/complete": "home",
    // "/(main)/categories": "home",
    // "/(main)/daily-summary": "home",
    // "/(main)/subscriptions": "home",
    // "/(main)/settings": "home",
    // "/(main)/[task_id]": "check",
  };

  const page_id = $derived(page.route.id ?? "");
  const icon_name = $derived(ICON_CHART[page_id]);
  const type = $derived(page.data.is_task_page ? "submit" : "button");
  const form = $derived(page.data.is_task_page ? "form" : null);
  const onclick = $derived(page.data.is_task_page ? null : () => goto(page.data.is_home ? "/create" : "/"));
</script>

{#if icon_name}
  <button
    {type}
    {form}
    class={[
      {
        "flex ml-auto justify-center items-center aspect-square rounded-full h-15 w-15 p-3": true,
        "bg-primary": page.data.is_home,
        "bg-card": !page.data.is_home,
      },
      rest.class || "",
    ]}
    {onclick}
    aria-label={page.data.is_task_page ? "Submit form" : page.data.is_home ? "Create new item" : "Go to home"}
  >
    {#if navigating.to}
      <Icon name="loading" class={{ "animate-spin text-2xl": true, "text-white": !!page.data.is_home }} />
    {:else}
      <Icon name={icon_name} class={{ "text-2xl": true, "text-white": !!page.data.is_home }} />
    {/if}
  </button>
{/if}
