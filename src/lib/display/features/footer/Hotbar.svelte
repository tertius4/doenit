<script>
  import t from "$display/translate";
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import View from "$display/view";

  /** @type {AL.CategoryListItem[]} */
  let category_list = $state([]);

  onMount(View.categories.categoryList(category_list));
</script>

{#if !!category_list.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
    <TagCategory
      disable_edit
      category={{ id: "default", name: t("DEFAULT_NAME"), task_count: /* TODO */0 }}
    />

    {#each category_list as category (category.id)}
      <TagCategory {category} />
    {/each}
  </nav>
{/if}
