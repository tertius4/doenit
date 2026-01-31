<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import CategoryButton from "./CategoryButton.svelte";
  import { t } from "$lib/services/language.svelte";
  import { selectedCategories } from "$lib/cached";
  import Icon from "$lib/components/element/Icon.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { onMount, untrack } from "svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import Drawer from "./element/Drawer.svelte";

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
</script>

<Drawer is_open={is_filter_open} onclose={() => (is_filter_open = false)}>
  <div class="grow flex flex-col relative h-full">
    <div class="absolute top-0 z-10 w-full flex gap-2 items-center justify-center rounded-t-2xl">
      <Icon name="categories" />
      <span class="font-medium">{t("categories")}</span>
    </div>

    <div class="pt-6 pb-12 h-full">
      <div class="max-h-[calc(90vh-48px-24px-28px)] overflow-y-auto">
        {#if categoriesContext.default_category}
          <CategoryButton id={categoriesContext.default_category.id} name={t("DEFAULT_NAME")} />
        {/if}

        {#each categoriesContext.categories as { id, name } (id)}
          <CategoryButton {id} {name} />
        {/each}
      </div>
    </div>

    <button
      class="fixed bottom-0 z-10 w-full bg-primary text-alt h-12 flex items-center gap-1 px-4"
      onclick={() => (is_adding = true)}
    >
      <Icon name="plus" class="m-auto text-xl" />
      <span class="w-full flex p-2 cursor-pointer text-left font-semibold">{t("create_new_category")}</span>
    </button>
  </div>
</Drawer>

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

  <Icon name="down-chevron" class="text-xl {is_filter_open ? '' : '-rotate-180'}" />
</button>

<ModalCreateCategory
  bind:open={is_adding}
  oncreate={async (new_category_id) => {
    Selected.categories.add(new_category_id);
    selectedCategories.set([...Selected.categories]);
  }}
/>
