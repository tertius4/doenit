<script>
  import { Selected } from "$lib/selected.svelte";
  import Categories from "$lib/icon/Categories.svelte";
  import { Check, Info, Star } from "$lib/icon";
  import Tag from "./Tag.svelte";
  import Modal from "./modal/Modal.svelte";
  import FavouriteCategorySetup from "./FavouriteCategorySetup.svelte";
  import { t } from "$lib/services/language.svelte";
  import Button from "./element/button/Button.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { user } from "$lib/base/user.svelte";

  let show_favourite_modal = $state(false);

  const categoriesContext = getCategoriesContext();

  const is_favourite_selected = $derived(
    !!user.favourite_category_ids.length &&
      user.favourite_category_ids.every((id) => Selected.categories.has(id)) &&
      user.favourite_category_ids.length === Selected.categories.size
  );

  /**
   * Toggles selection of a hotbar item.
   * @param {Category} category
   */
  function toggle(category) {
    Selected.do_now = false;

    if (Selected.categories.has(category.id)) {
      Selected.categories.delete(category.id);
    } else {
      for (const category_id of user.favourite_category_ids) {
        Selected.categories.delete(category_id);
      }
      Selected.categories.add(category.id);
    }
  }

  function selectFavourite() {
    if (!user.favourite_category_ids.length) {
      show_favourite_modal = true;
      return;
    }

    if (is_favourite_selected) {
      Selected.categories.clear();
    } else {
      Selected.categories.clear();
      Selected.do_now = false;

      for (const cat_id of user.favourite_category_ids) {
        Selected.categories.add(cat_id);
      }
    }
  }

  function selectDoNow() {
    Selected.do_now = !Selected.do_now;
    Selected.categories.clear();
  }
</script>

{#if !!categoriesContext.categories.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
    {#if !!categoriesContext.categories.length}
      <Tag round is_selected={is_favourite_selected} onclick={selectFavourite}>
        <Star />
      </Tag>
    {/if}

    <Tag onclick={selectDoNow} is_selected={Selected.do_now}>
      <span>{t("do_now")}</span>
    </Tag>

    {#each categoriesContext.categories as category}
      {@const is_selected = Selected.categories.has(category.id)}
      <Tag {is_selected} onclick={() => toggle(category)}>
        <Categories />
        <span>{category.name}</span>
      </Tag>
    {/each}
  </nav>
{/if}

<Modal bind:is_open={show_favourite_modal} class="p-0!">
  <div class="space-y-4 bg-page p-4">
    <p class="text-lg font-medium leading-tight">{t("setup_favourite_categories")}</p>
    <FavouriteCategorySetup />

    <div
      class={{
        "border rounded-lg px-2 flex flex-col gap-1 justify-center mt-2": true,
        "py-1.5 border border-default bg-surface": true,
      }}
    >
      <div class="flex gap-1 items-center">
        <Info class="text-lg flex-shrink-0" />
        <p class="leading-tight">{t("goto_app_settings")}</p>
      </div>
    </div>

    <Button class="bg-card" onclick={() => (show_favourite_modal = false)}>
      <Check />
      {t("confirm")}
    </Button>
  </div>
</Modal>
