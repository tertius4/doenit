<script>
  import { page } from "$app/state";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { ChartBar, Categories, Home, Check, Settings, Users } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  let is_mounted = false;

  setTimeout(() => (is_mounted = true), 300);

  const { onclose } = $props();

  const NAVIGATION_TIMES = $derived([
    { Icon: Home, label: t("home"), href: "/", show: true },
    { Icon: Check, label: t("completed_tasks"), href: "/complete" },
    { Icon: Categories, label: t("categories"), href: "/categories" },
    { Icon: Users, label: t("friends"), href: "/friends" },
    { Icon: ChartBar, label: t("daily_summary"), href: "/daily-summary" },
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
      {#each NAVIGATION_TIMES as { Icon, label, href, show }}
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
              <Icon class="text-xl my-auto" />
              <p class="my-auto line-clamp-1">{label}</p>
            </a>
          </li>
        {/if}
      {/each}
    </ul>

    <a href="/settings" draggable={false} class="absolute bottom-0 right-0 p-6 text-2xl">
      <Settings />
    </a>
  </div>
</aside>
