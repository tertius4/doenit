<script>
  import FavouriteCategorySetup from "$lib/components/FavouriteCategorySetup.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import { t } from "$lib/services/language.svelte";
  import { Cached } from "$lib/core/cache.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { onMount } from "svelte";

  const categoriesContext = getCategoriesContext();

  /** @type {SvelteSet<Category['id']>} */
  const selected_category_ids = new SvelteSet();
  /** @type {Category[]} */
  const categories = $derived([...categoriesContext.categories].sort(sortCategories));

  onMount(async () => {
    const ids = Cached.favouriteCategories.value?.split(",") ?? [];
    for (const id of ids) {
      if (!id) continue;

      selected_category_ids.add(id);
    }
  });

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

{#if !!categories.length}
  <Accordion label={t("app_settings")}>
    <div>
      <h3 class="mb-1">{t("favourite_categories")}:</h3>
      <FavouriteCategorySetup />
    </div>
  </Accordion>
{/if}
