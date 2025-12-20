<script>
  import AddFriends from "$lib/components/AddFriends.svelte";
  import { Plus, Loading, Check, Home } from "$lib/icon";
  import { navigating, page } from "$app/state";
  import { goto } from "$app/navigation";

  /** @type {Record<string, import("svelte").Component<*, {}, "">>}*/
  const ICON_CHART = {
    "/": Plus,
    "/create": Check,
    "/complete": Home,
    "/categories": Home,
    "/daily-summary": Home,
    "/plus": Home,
    "/settings": Home,
    "/[item_id]": Check,
  };

  const is_friends = $derived(page.url.pathname === "/friends");
  const page_id = $derived(page.route.id ?? "");
  const is_form_page = $derived(["/create", "/[item_id]"].includes(page_id));
  const is_home = $derived(page_id === "/");
  const Icon = $derived(ICON_CHART[page_id]);
  const type = $derived(is_form_page ? "submit" : "button");
  const form = $derived(is_form_page ? "form" : null);
  const onclick = $derived(is_form_page ? null : () => goto(page_id === "/" ? "/create" : "/"));
</script>

{#if is_friends}
  <AddFriends />
{:else if Icon}
  <button
    {type}
    {form}
    class="flex justify-center {is_home
      ? 'bg-primary'
      : 'bg-card'} items-center aspect-square rounded-full h-15 w-15 p-3"
    {onclick}
    aria-label={is_form_page ? "Submit form" : is_home ? "Create new item" : "Go to home"}
  >
    {#if navigating.to}
      <Loading class="text-2xl" />
    {:else}
      <Icon class="text-2xl {is_home ? 'text-white' : ''}" />
    {/if}
  </button>
{/if}
