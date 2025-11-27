<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import CategoryButton from "./CategoryButton.svelte";
  import { t } from "$lib/services/language.svelte";
  import { selectedCategories } from "$lib/cached";
  import { Plus, DownChevron } from "$lib/icon";
  import { slide } from "svelte/transition";
  import { Selected } from "$lib/selected.svelte";
  import { onMount, untrack } from "svelte";
  import Tab from "./element/tabs/Tab.svelte";
  import TabsContainer from "./element/tabs/TabsContainer.svelte";
  import Categories from "$lib/icon/Categories.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";

  const categoriesContext = getCategoriesContext();

  let is_adding = $state(false);
  let is_filter_open = $state(false);

  let active_tab = $state("Categories");
  let active_tab_index = $state(0);

  $effect(() => {
    active_tab_index;

    untrack(() => {
      active_tab = active_tab_index === 0 ? "Categories" : "Friends";
    });
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
    <div class="flex gap-1 max-w-screen">
      <button
        type="button"
        class={{
          "w-full bg-page p-2 flex gap-2 items-center justify-center rounded-t-2xl translate-y-[1px]": true,
          "border-transparent z-0": active_tab !== "Categories",
          "z-2": active_tab === "Categories",
        }}
        onclick={() => (active_tab_index = 0)}
      >
        <Categories />
        <span class="font-medium">Kategorieë</span>
      </button>
    </div>

    <TabsContainer class="border-t border-default" tabs_length={1} {active_tab_index} onchangetab={handleTabChange}>
      <Tab>
        <div class="h-full overflow-y-scroll">
          {#if categoriesContext.default_category}
            <CategoryButton id={categoriesContext.default_category.id} name={t("DEFAULT_NAME")} />
          {/if}

          {#each categoriesContext.categories as { id, name } (id)}
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
