<script>
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { Cached } from "$lib/core/cache.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import Tag from "$lib/components/Tag.svelte";
  import { onMount, untrack } from "svelte";
  import { Selected } from "$lib/selected.svelte";

  const categoriesContext = getCategoriesContext();

  let is_initialized = $state(false);

  /** @type {Category[]} */
  const categories = $derived([...categoriesContext.categories].sort(sortCategories));
  /** @type {SvelteSet<Category['id']>} */
  const selected_category_ids = new SvelteSet();

  $effect(() => {
    selected_category_ids.size;

    untrack(() => {
      if (!is_initialized) return;

      Cached.favouriteCategories.value = [...selected_category_ids].join(",");
    });
  });

  onMount(async () => {
    is_initialized = true;
    const ids = Cached.favouriteCategories.value?.split(",") ?? [];
    for (const id of ids) {
      if (!id) continue;

      selected_category_ids.add(id);
    }
  });

  /**
   * @param {string} category_id
   */
  function toggle(category_id) {
    if (selected_category_ids.has(category_id)) {
      selected_category_ids.delete(category_id);
      Selected.categories.delete(category_id);
    } else {
      selected_category_ids.add(category_id);
      Selected.categories.add(category_id);
    }
  }

  /**
   * @param {Category} a
   * @param {Category} b
   */
  function sortCategories(a, b) {
    const aSelected = selected_category_ids.has(a.id) ? 1 : 0;
    const bSelected = selected_category_ids.has(b.id) ? 1 : 0;
    if (aSelected !== bSelected) {
      return bSelected - aSelected; // selected first
    }
    return a.name.localeCompare(b.name);
  }
</script>

<div class="flex gap-1 flex-wrap">
  {#each categories as category (category.id)}
    {@const is_selected = !!selected_category_ids.has(category.id)}

    <Tag onclick={() => toggle(category.id)} {is_selected} class="max-w-60">
      <span class="truncate">{category.name}</span>
    </Tag>
  {/each}
</div>
