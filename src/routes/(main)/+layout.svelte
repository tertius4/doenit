<script>
  import Footer from "$display/features/footer/Footer.svelte";
  import Heading from "$display/features/header/Heading.svelte";
  import { context } from "$logic/context.svelte";
  import { backHandler } from "$logic/navigation";
  import { Capacitor } from "@capacitor/core";
  import { App } from "@capacitor/app";
  import { setContext, onMount, mount, untrack } from "svelte";
  import "../../app.css";
  import syncEngine from "$domain/sync/SyncEngine";
  import DB from "$domain/db";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import { runMigration } from "$logic/migrations/1_2/migration";
  import { fade } from "svelte/transition";
  import toast from "$display/toast/toast.svelte";
  import { InAppReview } from "@capacitor-community/in-app-review";
  import { Widget } from "$services/widget";
  import Api from "$logic/api";
  import DrawerLanguage from "$display/features/settings/DrawerLanguage.svelte";

  const { children, data } = $props();

  let show_migration_notice = $state(false);
  let is_ready = $state(false);

  const search_text = $state({ value: "" });
  setContext("search_text", search_text);

  onMount(async () => {
    const is_init_done = await data.ready;
    if (!is_init_done) return;

    Widget.init();
    if (Capacitor.isNativePlatform() && !(context.app_state.open_count % 20)) {
      await InAppReview.requestReview();
    }

    if (!context.settings.language) mount(DrawerLanguage, { target: document.body });

    is_ready = true;
  });

  onMount(() => {
    const stop = data.ready.then((is_init_done) =>
      is_init_done ? Api.widget.watchPendingCompletions() : () => {},
    );
    return () => {
      stop.then((fn) => fn());
    };
  });

  onMount(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => backHandler.handle());
    return () => listener.then((l) => l.remove());
  });

  // The initial sync is flushed by initApp; only react to later changes here.
  onMount(() => {
    const onOnline = () => syncEngine.requestTick();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  });

  $effect(() => {
    if (!is_ready) return;

    untrack(async () => {
      try {
        if (context.app_state.migration_1_complete) return;

        show_migration_notice = true;
        await runMigration();

        const update_result = await DB.app_state.update({ migration_1_complete: true });
        if (!update_result.ok) throw new Error(update_result.error);

        show_migration_notice = false;
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        toast.error("Migration failed: " + message);
        show_migration_notice = false;
      }
    });
  });

  // (Re)attach realtime listeners whenever the active scopes change (membership sync, join/leave, sign-in).
  let realtime_started = false;
  $effect(() => {
    if (!is_ready) return;

    const scopes = [...(context.user_state.active_scopes ?? [])];
    const stop = syncEngine.startRealtimeSync(scopes);
    if (realtime_started) syncEngine.requestTick();
    realtime_started = true;
    return stop;
  });

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context._settings?.theme || "dark");
  });

  $effect(() => {
    document.documentElement.style.setProperty("--base-size", `var(--${context._settings?.text_size || "md"})`);
  });
</script>

<main
  class="h-dvh relative grid grid-rows-[auto_1fr_auto] text-md text-normal bg-page **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <div class="relative max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow bg-page overflow-y-auto p-2">
    {#await data.ready}
      <div class="h-full flex items-center justify-center">
        <Icon name="loading" class="animate-spin text-2xl" />
      </div>
    {:then ok}
      {#if ok}
        {@render children()}
      {/if}
    {/await}
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
