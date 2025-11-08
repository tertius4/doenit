<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import CategoryButton from "./CategoryButton.svelte";
  import { t } from "$lib/services/language.svelte";
  import { selectedCategories } from "$lib/cached";
  import { Plus, DownChevron, Loading, Users } from "$lib/icon";
  import { slide } from "svelte/transition";
  import { Selected } from "$lib/selected";
  import { onMount, untrack } from "svelte";
  import { DB } from "$lib/DB";
  import Tab from "./element/tabs/Tab.svelte";
  import TabsContainer from "./element/tabs/TabsContainer.svelte";
  import user from "$lib/core/user.svelte";
  import RoomButton from "./RoomButton.svelte";
  import Button from "./element/button/Button.svelte";
  import GetDoenitPlus from "./GetDoenitPlus.svelte";
  import Categories from "$lib/icon/Categories.svelte";

  let is_adding = $state(false);
  let is_filter_open = $state(false);

  /** @type {Category?} */
  let default_category = $state(null);
  /** @type {Category[]} */
  let categories = $state([]);
  /** @type {Room[]} */
  let rooms = $state([]);

  let active_tab = $state("Categories");
  let active_tab_index = $state(0);
  /** @type {import('dexie').Subscription?}*/
  let room_sub = null;

  $effect(() => {
    active_tab_index;

    untrack(() => {
      active_tab = active_tab_index === 0 ? "Categories" : "Friends";
    });
  });

  $effect(() => {
    if (!user.value?.is_friends_enabled || !!room_sub) return;

    room_sub = DB.Room.subscribe((result) => (rooms = result), {
      selector: { archived: { $ne: true } },
      sort: [{ name: "asc" }],
    });

    return () => room_sub?.unsubscribe();
  });

  onMount(async () => {
    default_category = await DB.Category.getDefault();
  });

  onMount(() => {
    const sub = DB.Category.subscribe((result) => (categories = result), {
      selector: { archived: { $ne: true }, is_default: { $ne: true } },
      sort: [{ name: "asc" }],
    });

    return () => sub.unsubscribe();
  });

  onMount(() => {
    const token = backHandler.register(() => {
      if (is_filter_open) {
        is_filter_open = false;
        return true;
      }
      return false;
    }, 500);

    return () => backHandler.unregister(token);
  });

  /**
   * Handle tab changes.
   * @param {number} i
   */
  function handleTabChange(i) {
    active_tab_index = i;
  }
</script>

{#if is_filter_open}
  <div
    transition:slide
    class="absolute w-full flex flex-col shadow-t-md border-t border-default left-0 right-0 mt-1 bg-page rounded-t-2xl h-[60dvh] z-1 bottom-[93px]"
  >
    <div class="flex gap-1 px-2 max-w-screen pt-2">
      <button
        type="button"
        class={{
          "w-full p-2 flex gap-2 items-center justify-center border-t border-x rounded-t-2xl translate-y-[1px]": true,
          "bg-page border-transparent z-0": active_tab !== "Categories",
          "bg-surface z-2 border-default": active_tab === "Categories",
        }}
        onclick={() => (active_tab_index = 0)}
      >
        <Categories />
        <span class="font-medium">Kategorieë</span>
      </button>
      <button
        type="button"
        class={{
          "w-full flex gap-1 items-center justify-center p-2 border-t border-x rounded-t-2xl translate-y-[1px]": true,
          "bg-page border-transparent z-0": active_tab !== "Friends",
          "bg-surface z-2 border-default": active_tab === "Friends",
        }}
        onclick={() => (active_tab_index = 1)}
      >
        <Users />
        <span class="font-medium">Vriende</span>
      </button>
    </div>

    <TabsContainer class="border-t border-default" tabs_length={2} {active_tab_index} onchangetab={handleTabChange}>
      <Tab>
        <div class="h-full overflow-y-scroll">
          {#if default_category}
            <CategoryButton id={default_category.id} name={t("DEFAULT_NAME")} />
          {/if}
          {#each categories as { id, name } (id)}
            <CategoryButton {id} {name} />
          {/each}
        </div>

        <button
          class="relative w-full bg-primary text-alt h-12 flex items-center gap-1 px-4 shrink-0"
          onclick={() => (is_adding = true)}
        >
          <Plus class="m-auto text-xl" />
          <span class="w-full flex p-2 cursor-pointer text-left font-semibold">{t("create_new_category")}</span>
        </button>
      </Tab>

      <Tab>
        {#if user.is_loading}
          <div class="text-center py-8 bg-surface grow">
            <Loading class="text-4xl mx-auto mb-2 opacity-50" />
            <p>{t("loading")}</p>
          </div>
        {:else if user.value?.is_friends_enabled}
          {#each rooms as room (room.id)}
            <RoomButton id={room.id} name={room.name} />
          {/each}
        {:else}
          <GetDoenitPlus class="bg-surface" />
        {/if}
      </Tab>
    </TabsContainer>
  </div>
{/if}

<button
  class="w-full bg-card rounded-md h-15 px-4 flex items-center justify-between"
  onclick={(e) => {
    e.stopPropagation();
    is_filter_open = !is_filter_open;
  }}
>
  {#if Selected.categories.size === 0}
    {t("all_categories")}
  {:else if Selected.categories.size === 1}
    {t("category_selected")}
  {:else}
    {t("categories_selected", { count: Selected.categories.size })}
  {/if}

  <DownChevron class="{is_filter_open ? '' : '-rotate-180'} text-xl" />
</button>

<ModalCreateCategory
  bind:open={is_adding}
  oncreate={async (new_category_id) => {
    Selected.categories.add(new_category_id);
    selectedCategories.set([...Selected.categories]);
  }}
/>
