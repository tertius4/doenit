<script>
  import Icon from "$display/comps/Icon.svelte";
  import { Haptics } from "@capacitor/haptics";
  import Tag from "$display/comps/button/Tag.svelte";
  import t from "$display/translate";
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";
  import { selected_categories } from "$display/selected.svelte";

  /**
   * @typedef {Object} Props
   * @prop {AL.CategoryListItem} category - The category to display
   * @prop {boolean} [disable_edit=false] - Whether to disable editing this category
   */

  /** @type {Props} */
  const { category, disable_edit = false } = $props();

  let is_editing = $state(false);

  const is_selected = $derived(selected_categories.has(category.id));

  /**
   * Toggles selection of a hotbar item.
   * @param {AL.CategoryListItem} category
   */
  function toggle(category) {
    if (selected_categories.has(category.id)) {
      selected_categories.delete(category.id);
    } else {
      selected_categories.add(category.id);
    }
  }

  function handleLongPress() {
    if (disable_edit) return;

    Haptics.vibrate({ duration: 100 });
    is_editing = true;
  }
</script>

<Tag
  class={category.task_count != null ? "pr-1! " : ""}
  {is_selected}
  onclick={() => toggle(category)}
  onlongpress={handleLongPress}
>
  <span>{category.name}</span>
  {#if category.task_count != null}
    <div
      class={{
        "rounded-full px-2  flex items-center justify-center": true,
        "h-fit aspect-square": category.task_count < 10,
        "h-full": category.task_count >= 10,
        "bg-secondary-600 text-alt": is_selected,
        "bg-surface text-muted": !is_selected,
      }}
    >
      <span class="font-light font-mono text-sm">{category.task_count}</span>
    </div>
  {/if}
</Tag>

<ModalCategory bind:open={is_editing} name={category.name} id={category.id} />
