<script>
  import ButtonSearchTask from "$display/features/header/ButtonSearchTask.svelte";
  import DeleteAll from "$display/features/header/ButtonDeleteAll.svelte";
  import ButtonBack from "$display/features/header/ButtonBack.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import { getContext, onMount, untrack } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { backHandler } from "$logic/navigation";
  import ButtonMore from "./ButtonMore.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import t from "$display/translate";
  import { page } from "$app/state";
  import InputTextDebounce from "$display/comps/input/InputTextDebounce.svelte";

  let show_searchbar = $state(false);

  /** @type {Record<string, string>} */
  const TITLES = $derived({
    "/(main)": t("task_list"),
    "/(main)/create": t("new_task"),
    "/(main)/[item_id]": t("edit_task"),
    "/(main)/friends": t("friends"),
    "/(main)/complete": t("completed_tasks"),
    "/(main)/categories": t("categories"),
    "/(main)/settings": t("settings"),
    "/(main)/subscriptions": t("doenit_plus"),
    "/(main)/daily-summary": t("daily_summary"),
  });

  const search_text = getContext("search_text");

  const title = $derived(TITLES[page.route.id || ""] ?? t("task_list"));

  $effect(() => {
    page.url;

    untrack(() => {
      show_searchbar = false;
      search_text.value = "";
    });
  });

  onMount(() => {
    const token = backHandler.register(() => {
      if (show_searchbar) {
        show_searchbar = false;
        return true;
      }
      return false;
    }, 500);

    return () => backHandler.unregister(token);
  });

  function handleBackButton() {
    const token = BACK_BUTTON_FUNCTION.value;
    if (!token) return;

    const func = backHandler.handlers.get(token);
    if (func) func.handler();
  }
</script>

<div>
  <div class="relative grid grid-cols-[auto_1fr_auto] bg-surface border-default border-b">
    <div>
      {#if !page.data.is_home}
        <ButtonBack onclick={handleBackButton} />
      {/if}
    </div>

    <div class="w-fit mx-auto flex items-center justify-center gap-1 py-2">
      <img alt="logo" src="logo.png" class="w-3xl" class:invisible={!title} />
      <div class="relative">
        <span class="text-transparent text-3xl font-bold px-2 line-clamp-1">{title}</span>
        {#key title}
          <h1 transition:fade={{ duration: 100 }} class="absolute inset-0 text-3xl font-bold line-clamp-1">
            {title}
          </h1>
        {/key}
      </div>
    </div>

    <div>
      {#if selected_tasks.size}
        <DeleteAll />
        <ButtonMore />
      {:else if page.data.is_home || page.data.is_completed_page}
        <ButtonSearchTask bind:show={show_searchbar} />
      {/if}
    </div>
  </div>

  {#if show_searchbar}
    <div class="p-2 bg-surface" transition:slide={{ duration: 200 }}>
      <InputTextDebounce
        value={search_text.value}
        onchange={(value) => (search_text.value = value)}
        debounce={300}
        class="h-12"
        placeholder={t("search")}
        can_clear
        focus_on_mount
      />
    </div>
  {/if}
</div>
