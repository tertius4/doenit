<script>
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import { selected_categories, selected_tasks } from "$display/selected.svelte";

  const { id, name } = $props();

  const is_selected = $derived(selected_categories.has(id));

  /**
   * Handles the selection of a category.
   * @param {Event} [event]
   */
  function onselect(event) {
    event?.stopPropagation();

    selected_tasks.clear();
    if (is_selected) {
      selected_categories.delete(id);
    } else {
      selected_categories.add(id);
    }
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
