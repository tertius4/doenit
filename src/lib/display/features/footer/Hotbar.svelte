<script>
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import View from "$display/view";
  import { slide } from "svelte/transition";

  /** @type {AL.CategoryListItem[]} */
  let categories = $state([]);

  onMount(View.categories.hotbarCategoryList(categories));
</script>

{#if !!categories.length}
  <nav
    transition:slide
    class="w-screen overflow-hidden p-2 bg-surface border-t border-default flex gap-1 overflow-x-auto scrollbar-none"
  >
    {#each categories as category (category.id)}
      <TagCategory {category} disable_edit={category.id === "default"} />
    {/each}
  </nav>
{/if}
