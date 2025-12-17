<script>
  import { user } from "$lib/base/user.svelte";
  import { Categories } from "$lib/icon";
  import { Selected } from "$lib/selected.svelte";
  import { Haptics } from "@capacitor/haptics";
  import EditCategory from "./EditCategory.svelte";
  import Tag from "./Tag.svelte";
  import { t } from "$lib/services/language.svelte";

  const { category, items_count, disable_edit = false } = $props();

  let is_editing = $state(false);

  const is_selected = $derived(Selected.categories.has(category.id));

  /**
   * Toggles selection of a hotbar item.
   * @param {Category} category
   */
  function toggle(category) {
    Selected.do_now = false;

    if (Selected.categories.has(category.id)) {
      Selected.categories.delete(category.id);
    } else {
      for (const category_id of user.favourite_category_ids) {
        Selected.categories.delete(category_id);
      }
      Selected.categories.add(category.id);
    }
  }

  function handleLongPress() {
    if (disable_edit) return;

    Haptics.vibrate({ duration: 100 });
    is_editing = true;
  }
</script>

<Tag class={!!items_count ? "pr-1!" : ""} {is_selected} onclick={() => toggle(category)} onlongpress={handleLongPress}>
  <Categories />
  <span>{category.name || t("DEFAULT_NAME")}</span>
  {#if items_count}
    <div class="h-fit bg-surface rounded-full py-0.5 px-1.5 aspect-square flex items-center justify-center">
      <span class="text-muted font-light">{items_count}</span>
    </div>
  {/if}
</Tag>

<EditCategory bind:is_editing {category} />
