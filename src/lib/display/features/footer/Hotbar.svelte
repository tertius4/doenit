<script>
  import TagList from "./TagList.svelte";
  import { onMount } from "svelte";
  import { hotbar_lists, startHotbarLists } from "$display/view/hotbar.svelte";

  onMount(startHotbarLists);
</script>

{#if !!hotbar_lists.length}
  <nav class="w-full min-w-0 p-2 bg-surface border-t border-default flex gap-1.5 overflow-x-auto scrollbar-none">
    {#each hotbar_lists as list (list.id)}
      <TagList {list} />
    {/each}
  </nav>
{/if}
