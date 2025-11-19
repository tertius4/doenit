<script>
  import { onMount, untrack } from "svelte";
  import { DB } from "$lib/DB";
  import { Selected } from "$lib/selected";
  import Categories from "$lib/icon/Categories.svelte";
  import { sortByField } from "$lib";
  import { Check, Info, Star, Users } from "$lib/icon";
  import Tag from "./Tag.svelte";
  import { Cached } from "$lib/core/cache.svelte";
  import Modal from "./modal/Modal.svelte";
  import FavouriteCategorySetup from "./FavouriteCategorySetup.svelte";
  import { t } from "$lib/services/language.svelte";
  import Button from "./element/button/Button.svelte";
  import user from "$lib/core/user.svelte";

  /** @type {Category[]} */
  let categories = $state([]);
  /** @type {string[]} */
  let favourite_cat_ids = $state([]);

  let show_favourite_modal = $state(false);

  const is_favourite_selected = $derived(
    favourite_cat_ids.length !== 0 &&
      favourite_cat_ids.every((id) => Selected.categories.has(id)) &&
      favourite_cat_ids.length === Selected.categories.size
  );
  const items = $derived.by(() => {
    /** @type {{ id: string, name: string, type: "category" }[]} */
    let items = [];

    for (const category of categories) {
      if (favourite_cat_ids.includes(category.id)) continue;

      items.push({
        id: category.id,
        name: category.name,
        type: "category",
      });
    }

    return sortByField(items, "name");
  });

  $effect(() => {
    const ids = Cached.favouriteCategories.value?.split(",") ?? [];

    untrack(() => {
      for (const id of ids) {
        if (!id) continue;

        favourite_cat_ids.push(id);
        Selected.categories.add(id);
      }
    });
  });

  onMount(() => {
    const sub = DB.Category.subscribe((result) => (categories = result), {
      selector: { archived: { $ne: true }, is_default: { $ne: true } },
      sort: [{ name: "asc" }],
    });

    return () => sub.unsubscribe();
  });

  /**
   * Toggles selection of a hotbar item.
   * @param {{ id: string, name: string, type: "category" }} item
   */
  function toggle(item) {
    if (Selected.categories.has(item.id)) {
      Selected.categories.delete(item.id);
    } else {
      for (const cat_id of favourite_cat_ids) {
        Selected.categories.delete(cat_id);
      }
      Selected.categories.add(item.id);
    }
  }

  function selectFavourite() {
    if (favourite_cat_ids.length === 0) {
      show_favourite_modal = true;
      return;
    }

    if (is_favourite_selected) {
      for (const cat_id of favourite_cat_ids) {
        Selected.categories.delete(cat_id);
      }
    } else {
      Selected.categories.clear();

      for (const cat_id of favourite_cat_ids) {
        Selected.categories.add(cat_id);
      }
    }
  }
</script>

{#if !!items.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
    {#if !!categories.length}
      <Tag round is_selected={is_favourite_selected} onclick={selectFavourite}>
        <Star />
      </Tag>
    {/if}

    {#each items as item}
      {@const is_selected = Selected.categories.has(item.id)}
      <Tag {is_selected} onclick={() => toggle(item)}>
        <Categories />
        <span>{item.name}</span>
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
