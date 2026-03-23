<script>
  import { Selected } from "$lib/selected.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import Tag from "$display/comps/button/Tag.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import FavouriteCategorySetup from "../../../../components/FavouriteCategorySetup.svelte";
  import t from "$display/translate";
  import Button from "../../../../components/element/button/Button.svelte";
  import { user } from "$lib/core/user.svelte";
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import View from "$display/view";
  import Api from "$logic/api";

  let show_favourite_modal = $state(false);

  /** @type {Logic.CategoryListItem[]} */
  let category_list = $state([]);

  const tasks_count_map = $derived(await Api.cats.mapTasksCountToCategories());

  onMount(View.categories.categoryList(category_list));

  const is_favourite_selected = $derived(
    !!user.favourite_category_ids.length &&
      user.favourite_category_ids.every((id) => Selected.categories.has(id)) &&
      user.favourite_category_ids.length === Selected.categories.size,
  );

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

{#if !!category_list.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
    <Tag round is_selected={is_favourite_selected} onclick={selectFavourite}>
      <Icon name="star" class="w-4 h-4" />
    </Tag>

    <Tag onclick={selectDoNow} is_selected={Selected.do_now}>
      <span>{t("do_now")}</span>
    </Tag>

    <TagCategory
      disable_edit
      category={{ id: "default", name: t("DEFAULT_NAME") }}
      task_count={tasks_count_map.get("default")}
    />

    {#each category_list as category (category.id)}
      <TagCategory {category} task_count={category.task_count} />
    {/each}
  </nav>
{/if}

<Modal bind:is_open={show_favourite_modal} class="space-y-4">
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
        <Icon name="info" class="text-lg shrink-0" />
        <p class="leading-tight">{t("goto_app_settings")}</p>
      </div>
    </div>

    <Button class="bg-card" onclick={() => (show_favourite_modal = false)}>
      <Icon name="check" />
      {t("confirm")}
    </Button>
  </div>
</Modal>
