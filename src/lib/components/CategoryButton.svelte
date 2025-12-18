<script>
  import { selectedCategories } from "$lib/cached";
  import InputCheckbox from "./element/input/InputCheckbox.svelte";
  import { Selected } from "$lib/selected.svelte";

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
    "w-full flex h-12 items-center gap-1": true,
    "bg-surface": !is_selected,
    "bg-card": is_selected,
  }}
  onclick={onselect}
>
  <div class="relative w-12 h-12">
    <InputCheckbox {is_selected} tick_animation={is_selected} class="w-12 h-12" />
  </div>
  <div class="w-full text-left my-auto">
    {name}
  </div>
</button>
