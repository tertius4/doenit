<script>
  import { Selected } from "$lib/selected.svelte";
  import Tag from "$display/comps/button/Tag.svelte";
  import t from "$display/translate";
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import View from "$display/view";
  import Api from "$logic/api";

  /** @type {Logic.CategoryListItem[]} */
  let category_list = $state([]);

  const tasks_count_map = $derived(await Api.cats.mapTasksCountToCategories());

  onMount(View.categories.categoryList(category_list));

  function selectDoNow() {
    Selected.do_now = !Selected.do_now;
    Selected.categories.clear();
  }
</script>

{#if !!category_list.length}
  <nav class="bg-surface border-t border-default p-2 flex gap-1 overflow-x-auto scrollbar-none">
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
