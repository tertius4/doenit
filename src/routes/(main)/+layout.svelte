<script>
  import Footer from "$display/features/footer/Footer.svelte";
  import Heading from "$display/features/header/Heading.svelte";
  import { context } from "$logic/context.svelte";
  import { backHandler } from "$logic/navigation";
  import { Capacitor } from "@capacitor/core";
  import { App } from "@capacitor/app";
  import { setContext, onMount } from "svelte";
  import "../../app.css";
  import syncEngine from "$domain/sync/SyncEngine";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import { runMigration } from "$logic/migrations/1_2/migration";
  import { fade } from "svelte/transition";

  let show_migration_notice = $state(false);

  onMount(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => backHandler.handle());
    return () => listener.then((l) => l.remove());
  });

  onMount(async () => {
    if (context.app_state.migration_1_complete) return;

    show_migration_notice = true;
    await runMigration();
    context.app_state.migration_1_complete = true;
    show_migration_notice = false;
  });

  onMount(() => {
    let stopRealtimeSync = () => {};
    const onOnline = () => syncEngine.requestTick();

    stopRealtimeSync = syncEngine.startRealtimeSync(context.user_state.active_scopes ?? []);
    syncEngine.requestTick();

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      stopRealtimeSync?.();
    };
  });

  const search_text = $state({ value: "" });
  setContext("search_text", search_text);

  const { children } = $props();

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context.settings.theme || "dark");
  });

  $effect(() => {
    document.documentElement.style.setProperty("--base-size", `var(--${context.settings.text_size || "md"})`);
  });
</script>

<main
  class="h-dvh relative grid grid-rows-[auto_1fr_auto] text-md text-normal bg-page **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <div class="relative max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow bg-page overflow-y-auto p-2">
    {@render children()}
  </div>

  <Footer />
</main>

{#if show_migration_notice}
  <div transition:fade class="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4 select-none">
    <Icon name="loading" class="text-white animate-spin" />
    <h2 class="text-xl font-bold text-white">{t("migration_notice_title")}</h2>
    <p class="text-white">{t("migration_notice_message")}</p>
  </div>
{/if}
