<script>
  import { user } from "$lib/core/user.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { Haptics } from "@capacitor/haptics";
  import Tag from "$display/comps/button/Tag.svelte";
  import t from "$display/translate";
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";

  const { category, task_count, disable_edit = false } = $props();

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

<Tag class={!!task_count ? "pr-1!" : ""} {is_selected} onclick={() => toggle(category)} onlongpress={handleLongPress}>
  <Icon name="categories" size={16} />
  <span>{category.name || t("DEFAULT_NAME")}</span>
  {#if task_count != null}
    <div class="h-fit bg-surface rounded-full px-2 aspect-square flex items-center justify-center">
      <span class="text-muted font-light font-mono text-sm">{task_count}</span>
    </div>
  {/if}
</Tag>

<ModalCategory bind:open={is_editing} {category} />