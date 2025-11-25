<script>
  import { selectedCategories } from "$lib/cached";
  import InputCheckbox from "./element/input/InputCheckbox.svelte";
  import { Selected } from "$lib/selected";

  const { id, name } = $props();

  const is_selected = $derived(Selected.categories.has(id));

  /**
   * Handles the selection of a category.
   * @param {Event} event
   */
  function onselect(event) {
    event.stopPropagation();

    Selected.tasks.clear();
    if (is_selected) {
      Selected.categories.delete(id);
    } else {
      Selected.categories.add(id);
    }
    selectedCategories.set([...Selected.categories]);
  }
</script>

<button
  class={{
    "relative w-full flex h-12 items-center gap-1": true,
    "bg-page": !is_selected,
    "bg-card": is_selected,
  }}
  onclick={onselect}
>
  <InputCheckbox {is_selected} tick_animation={is_selected} />
  <span class="w-full flex pl-12 p-2 text-left">
    {name}
  </span>
</button>
