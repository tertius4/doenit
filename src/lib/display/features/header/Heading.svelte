<script>
  import ButtonSearchTask from "$display/features/header/ButtonSearchTask.svelte";
  import DeleteAll from "$display/features/header/ButtonDeleteAll.svelte";
  import InputText from "$display/comps/input/InputText.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import { getContext, onMount, untrack } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { backHandler } from "$logic/navigation";
  import ButtonMore from "./ButtonMore.svelte";
  import { BACK_BUTTON_FUNCTION, capitalize } from "$lib";
  import t from "$display/translate";
  import { page } from "$app/state";
  import EditGroup from "../groups/EditGroup.svelte";
  import ButtonBack from "./ButtonBack.svelte";

  const search_text = getContext("search_text");

  let is_editing = $state(false);
  let show_searchbar = $state(false);

  /** @type {Record<string, string>} */
  const TITLES = $derived({
    "/(main)": t("task_list"),
    "/(main)/create": t("new_task"),
    "/(main)/[task_id]": t("edit_task"),
    "/(main)/friends": t("friends"),
    "/(main)/complete": t("completed_tasks"),
    "/(main)/categories": t("categories"),
    "/(main)/settings": t("settings"),
    "/(main)/subscriptions": t("doenit_plus"),
    "/(main)/groups": t("groups"),
    "/(main)/groups/[group_id]": page.data.group?.name ?? t("groups"),
    "/(main)/contacts": t("contact_list"),
    "/db/[collection]": capitalize(t("database")),
    "/db": capitalize(t("database")),
  });

  const title = $derived(TITLES[page.route.id || ""] ?? t("task_list"));
  const { id, name, description, owner_id } = $derived(page.data.group ?? {});

  $effect(() => {
    page.url;

    untrack(() => {
      if (!search_text) return;
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

  function handleClick() {
    if (!page.data.is_group_page) return;

    is_editing = true;
  }
</script>

<div class="bg-surface" style="padding-top: env(safe-area-inset-top);">
  <div class="relative flex items-center border-default border-b h-14">
    <div class="shrink-0 z-1 ml-2">
      {#if !page.data.is_main_page}
        <ButtonBack onclick={handleBackButton} />
      {/if}
    </div>

    <button
      type="button"
      class="w-fit mx-auto absolute inset-0 flex items-center justify-center gap-1 py-2 z-0"
      class:pointer-events-none={!page.data.is_group_page}
      onclick={handleClick}
    >
      <div class="w-fit mx-auto flex items-center justify-center gap-0.5 py-2">
        <img alt="logo" src="/logo.png" class="w-3xl" />
        <div class="relative">
          <span class="invisible text-3xl font-bold px-2 line-clamp-1">{title}</span>
          {#key title}
            <h1
              transition:fade={{ duration: 100 }}
              class="absolute inset-0 text-3xl font-bold line-clamp-1 h-fit my-auto"
            >
              {title}
            </h1>
          {/key}
        </div>
      </div>
    </button>

    <div class="flex gap-2 z-2 ml-auto shrink-0">
      {#if selected_tasks.size}
        <DeleteAll />
      {:else if page.data.is_home || page.data.is_completed_page}
        <ButtonSearchTask bind:show={show_searchbar} />
      {/if}

      {#if !page.data.is_task_page}
        <ButtonMore />
      {/if}
    </div>
  </div>

  {#if show_searchbar}
    <div class="p-2 bg-surface" transition:slide={{ duration: 200 }}>
      <InputText
        value={search_text.value}
        onchange={(value) => (search_text.value = value)}
        class="h-12"
        placeholder={t("search")}
        can_clear
        focus_on_mount
      />
    </div>
  {/if}
</div>

<EditGroup bind:open={is_editing} {id} {name} {description} {owner_id} />
