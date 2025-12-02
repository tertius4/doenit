<script>
  import { page } from "$app/state";
  import { fade, slide } from "svelte/transition";
  import ButtonBack from "$lib/components/element/button/ButtonBack.svelte";
  import DeleteAll from "$lib/components/DeleteAll.svelte";
  import { t } from "$lib/services/language.svelte";
  import { Selected } from "$lib/selected.svelte";
  import ButtonSearchTask from "$lib/components/element/button/ButtonSearchTask.svelte";
  import { getContext, onMount, untrack } from "svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import InputTextDebounce from "$lib/components/element/input/InputTextDebounce.svelte";
  import ButtonMore from "$lib/components/element/button/ButtonMore.svelte";

  let show_searchbar = $state(false);

  /** @type {Record<string, string>} */
  const TITLES = $derived({
    "/": t("task_list"),
    "/create": t("new_task"),
    "/[item_id]": t("edit_task"),
    "/friends": t("friends"),
    "/complete": t("completed_tasks"),
    "/categories": t("categories"),
    "/settings": t("settings"),
    "/plus": "",
  });

  const title = $derived(TITLES[page.route.id ?? "/"] ?? t("task_list"));
  const search_text = getContext("search_text");
  const is_home = $derived(page.route.id === "/");
  const is_done = $derived(page.route.id === "/complete");

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
</script>

<div class="flex flex-col">
  <div class="flex p-1 bg-surface border-default border-b">
    <div class="h-full mr-2 aspect-square flex items-center justify-start">
      <ButtonBack
        class="bg-card"
        onclick={() => {
          const token = BACK_BUTTON_FUNCTION.value;
          if (!token) return;

          const func = backHandler.handlers.get(token);
          if (func) func.handler();
        }}
      />
    </div>

    <div class="w-fit mx-auto flex items-center justify-center gap-1 py-2">
      <img alt="logo" src="logo.png" class="w-3xl {title ? '' : 'invisible'}" />
      <div class="relative">
        <span class="text-transparent text-3xl font-bold px-2 line-clamp-1">{title}</span>
        {#key title}
          <h1 transition:fade={{ duration: 100 }} class="absolute inset-0 text-3xl font-bold line-clamp-1">
            {title}
          </h1>
        {/key}
      </div>
    </div>

    <div class="h-full aspect-square ml-2 flex items-center justify-start">
      {#if Selected.tasks.size}
        <DeleteAll />
        <ButtonMore />
      {:else if is_home || is_done}
        <ButtonSearchTask bind:show={show_searchbar} />
      {/if}
    </div>
  </div>

  {#if show_searchbar}
    <div class="p-2 bg-surface" transition:slide={{ duration: 200 }}>
      <InputTextDebounce
        bind:value={search_text.value}
        debounce={300}
        class="h-12"
        placeholder={t("search")}
        can_clear
        focus_on_mount
      />
    </div>
  {/if}
</div>
