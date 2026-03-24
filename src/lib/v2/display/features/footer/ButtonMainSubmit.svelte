<script>
  import AddFriends from "$lib/components/AddFriends.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { navigating, page } from "$app/state";
  import { goto } from "$app/navigation";

  /** @type {Record<string, string>}*/
  const ICON_CHART = {
    "/(main)": "plus",
    "/(main)/create": "check",
    "/(main)/complete": "home",
    "/(main)/categories": "home",
    "/(main)/daily-summary": "home",
    "/(main)/subscriptions": "home",
    "/(main)/settings": "home",
    "/(main)/[item_id]": "check",
  };

  const page_id = $derived(page.route.id ?? "");
  const icon_name = $derived(ICON_CHART[page_id]);
  const type = $derived(page.data.is_task_page ? "submit" : "button");
  const form = $derived(page.data.is_task_page ? "form" : null);
  const onclick = $derived(page.data.is_task_page ? null : () => goto(page.data.is_home ? "/create" : "/"));
</script>

{#if page.data.is_friends_page}
  <AddFriends />
{:else if icon_name}
  <button
    {type}
    {form}
    class={{
      "flex justify-center items-center aspect-square rounded-full h-15 w-15 p-3",
      "bg-primary": page.data.is_home,
      "bg-card": !page.data.is_home,
    }}
    {onclick}
    aria-label={page.data.is_task_page ? "Submit form" : page.data.is_home ? "Create new item" : "Go to home"}
  >
    {#if navigating.to}
      <Icon name="loading" class="animate-spin text-2xl" />
    {:else}
      <Icon name={icon_name} class={{ "text-2xl": true, "text-white": !!page.data.is_home }} />
    {/if}
  </button>
{/if}
