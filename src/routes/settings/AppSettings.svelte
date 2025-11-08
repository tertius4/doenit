<script>
  import Accordion from "$lib/components/element/Accordion.svelte";
  import { t } from "$lib/services/language.svelte";
  import FavouriteCategorySetup from "$lib/components/FavouriteCategorySetup.svelte";
  import { onMount } from "svelte";
  import { Cached } from "$lib/core/cache.svelte";
  import { DB } from "$lib/DB";
  import { SvelteSet } from "svelte/reactivity";

  /** @type {Category[]} */
  let categories = $state([]);

  /** @type {SvelteSet<Category['id']>} */
  const selected_category_ids = new SvelteSet();

  onMount(async () => {
    const ids = Cached.favouriteCategories.value?.split(",") ?? [];
    for (const id of ids) {
      if (!id) continue;

      selected_category_ids.add(id);
    }
  });

  onMount(() => {
    const sub = DB.Category.subscribe(
      (result) =>
        (categories = result.sort((a, b) => {
          const aSelected = selected_category_ids.has(a.id) ? 1 : 0;
          const bSelected = selected_category_ids.has(b.id) ? 1 : 0;
          if (aSelected !== bSelected) {
            return bSelected - aSelected; // selected first
          }
          return a.name.localeCompare(b.name);
        })),
      {
        selector: { archived: { $ne: true }, is_default: { $ne: true } },
      }
    );

    return () => sub.unsubscribe();
  });
</script>

{#if categories.length !== 0}
  <Accordion label={t("app_settings")}>
    <div>
      <h3 class="mb-1">{t("favourite_categories")}:</h3>
      <FavouriteCategorySetup />
    </div>
  </Accordion>
{/if}
