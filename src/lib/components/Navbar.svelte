<script>
  import { page } from "$app/state";
  import { backHandler } from "$lib/BackHandler.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { t } from "$lib/services/language.svelte";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  let is_mounted = false;

  setTimeout(() => (is_mounted = true), 300);

  const { onclose } = $props();

  const NAVIGATION_TIMES = $derived([
    { icon: "home", label: t("home"), href: "/", show: true },
    { icon: "check", label: t("completed_tasks"), href: "/complete" },
    { icon: "categories", label: t("categories"), href: "/categories" },
    { icon: "users", label: t("friends"), href: "/friends" },
    { icon: "chart-bar", label: t("daily_summary"), href: "/daily-summary" },
  ]);

  onMount(() => {
    const token = backHandler.register(() => {
      if (is_mounted) {
        onclose();
        return true;
      }
      return false;
    }, 501);

    return () => backHandler.unregister(token);
  });
</script>

<svelte:window
  onclick={() => {
    if (is_mounted) onclose();
  }}
/>

<aside transition:fly={{ x: -100 }} class="fixed top-0 left-0 max-w-[90vw] w-64 h-full bg-page shadow-r-lg z-50">
  <div class="w-full h-full relative flex flex-col items-center justify-center">
    <h2 class="text-lg font-semibold">{t("menu")}</h2>
    <ul class="mt-4 space-y-0">
      {#each NAVIGATION_TIMES as { icon, label, href, show }}
        {#if show === undefined || show}
          {@const is_active = page.url.pathname === href}
          <li>
            <a
              {href}
              draggable="false"
              class="grid grid-cols-[32px_auto] gap-1 py-4 px-8 rounded-lg"
              class:bg-card={is_active}
              class:font-semibold={is_active}
            >
              <Icon name={icon} class="w-5 h-5 my-auto" />
              <p class="my-auto line-clamp-1">{label}</p>
            </a>
          </li>
        {/if}
      {/each}
    </ul>

    <a href="/settings" draggable={false} class="absolute bottom-0 right-0 p-6">
      <Icon name="settings" class="w-5 h-5" />
    </a>
  </div>
</aside>
