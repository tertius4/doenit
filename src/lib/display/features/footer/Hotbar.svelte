<script>
  import t from "$display/translate";
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import View from "$display/view";
  import Api from "$logic/api";

  /** @type {AL.CategoryListItem[]} */
  let category_list = $state([]);

  const tasks_count_map = $derived(await Api.cats.mapTasksCountToCategories());

  onMount(View.categories.categoryList(category_list));
</script>

{#if !!category_list.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
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
