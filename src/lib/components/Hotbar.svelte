<script>
  import { Selected } from "$lib/selected.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import Tag from "./Tag.svelte";
  import Modal from "./modal/Modal.svelte";
  import FavouriteCategorySetup from "./FavouriteCategorySetup.svelte";
  import { t } from "$lib/services/language.svelte";
  import Button from "./element/button/Button.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { getTasksContext } from "$lib/contexts/tasks.svelte";
  import { user } from "$lib/base/user.svelte";
  import CategoryTag from "./CategoryTag.svelte";
  import { untrack } from "svelte";

  let show_favourite_modal = $state(false);

  const categoriesContext = getCategoriesContext();
  const tasksContext = getTasksContext();

  const CATEGORY_TASKS_COUNT = $derived.by(() => {
    return tasksContext.tasks.reduce((acc, task) => {
      untrack(() => {
        const category_id = task.category_id || categoriesContext.default_category?.id;
        if (!category_id) return;
        if (task.archived) return;

        if (!acc[category_id]) {
          acc[category_id] = 0;
        }

        acc[category_id]++;
      });
      return acc;
    }, /** @type {Record<string, number>}*/ ({}));
  });

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

{#if !!categoriesContext.categories.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
    {#if !!categoriesContext.categories.length}
      <Tag round is_selected={is_favourite_selected} onclick={selectFavourite}>
        <Icon name="star" class="w-4 h-4" />
      </Tag>
    {/if}

    <Tag onclick={selectDoNow} is_selected={Selected.do_now}>
      <span>{t("do_now")}</span>
    </Tag>

    {#if categoriesContext.default_category}
      <CategoryTag
        disable_edit
        category={categoriesContext.default_category}
        items_count={CATEGORY_TASKS_COUNT[categoriesContext.default_category.id]}
      />
    {/if}

    {#each categoriesContext.categories as category (category.id)}
      <CategoryTag {category} items_count={CATEGORY_TASKS_COUNT[category.id]} />
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
