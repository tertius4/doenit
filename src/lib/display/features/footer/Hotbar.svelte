<script>
  import TagCategory from "./TagCategory.svelte";
  import { onMount } from "svelte";
  import { hotbar_categories, startHotbarCategories } from "$display/view/hotbar.svelte";

  onMount(startHotbarCategories);
</script>

{#if !!hotbar_categories.length}
  <nav class="w-full min-w-0 p-2 bg-surface border-t border-default flex gap-1.5 overflow-x-auto scrollbar-none">
    {#each hotbar_categories as category (category.id)}
      <TagCategory {category} disable_edit={category.id === "default"} />
    {/each}
  </nav>
{/if}
