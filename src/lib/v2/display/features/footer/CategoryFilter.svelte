<script>
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";
  import { backHandler } from "$logic/navigation";
  import ButtonCategory from "./ButtonCategory.svelte";
  import { t } from "$lib/services/language.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { onMount } from "svelte";
  import Drawer from "$lib/components/element/Drawer.svelte";
  import Api from "$logic/api";
  import View from "$display/view";

  /** @type {Logic.CategoryListItem[]} */
  let category_list = $state([]);

  let is_adding = $state(false);
  let is_filter_open = $state(false);

  onMount(View.categories.categoryList(category_list));
  onMount(() => {
    const token = backHandler.register(() => {
      if (is_filter_open) {
        is_filter_open = false;
        return true;
      }
      return is_filter_open;
    }, 500);

    return () => backHandler.unregister(token);
  });
</script>

<Drawer is_open={is_filter_open} onclose={() => (is_filter_open = false)}>
  <div class="grow flex flex-col relative h-full">
    <div class="absolute top-0 z-10 w-full flex gap-2 items-center justify-center rounded-t-2xl">
      <Icon name="categories" size={24} />
      <span class="font-medium">{t("categories")}</span>
    </div>

    <div class="pt-6 pb-12 h-full">
      <div class="max-h-[calc(90vh-48px-24px-28px)] overflow-y-auto">
        <ButtonCategory id="default" name={t("DEFAULT_NAME")} />

        {#each category_list as { id, name } (id)}
          <ButtonCategory {id} {name} />
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
  onclick={() => (is_filter_open = !is_filter_open)}
>
  {#if Selected.categories.size === 0}
    {t("all_categories")}
  {:else if Selected.categories.size === 1}
    {t("category_selected")}
  {:else}
    {t("categories_selected", { count: Selected.categories.size })}
  {/if}

  <Icon name="chevron-down" class={is_filter_open ? "" : "-rotate-180"} />
</button>

<ModalCategory bind:open={is_adding} />
