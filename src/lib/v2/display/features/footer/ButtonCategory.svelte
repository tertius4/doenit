<script>
  import { selectedCategories } from "$lib/cached";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import { Selected } from "$lib/selected.svelte";

  const { id, name } = $props();

  const is_selected = $derived(Selected.categories.has(id));

  /**
   * Handles the selection of a category.
   * @param {Event} [event]
   */
  function onselect(event) {
    event?.stopPropagation();

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
  type="button"
  class={{
    "w-full flex h-12 px-2 items-center gap-2 hover:bg-card cursor-pointer": true,
    "bg-surface": !is_selected,
    "bg-card": is_selected,
  }}
  onclick={onselect}
>
  <InputCheckbox checked={is_selected} onchange={() => onselect()} />
  <div class="w-full text-left my-auto">
    {name}
  </div>
</button>
