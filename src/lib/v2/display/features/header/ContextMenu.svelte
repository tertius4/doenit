<script>
  import { slide } from "svelte/transition";
  import { Selected } from "$lib/selected.svelte";
  import BulkAssignCategory from "$lib/components/BulkAssignCategory.svelte";
  import { on } from "svelte/events";
  import ButtonShareTask from "./ButtonShareTask.svelte";

  let { show = $bindable() } = $props();

  /**
   *
   * @param {HTMLElement} node
   */
  function clickedoutside(node) {
    on(window, "click", (event) => {
      const target = /** @type {Node}  */ (event.target);
      if (!node.contains(target)) {
        show = false;
      }
    });
  }
</script>

<div
  {@attach clickedoutside}
  id="context-menu"
  transition:slide
  class="absolute right-4 w-75 max-w-[90%] top-16 bg-surface rounded-lg shadow-lg border border-default z-50 p-2 space-y-2"
>
  <ButtonShareTask onclick={() => (show = false)} />
  <BulkAssignCategory
    onclose={() => {
      show = false;
      Selected.tasks.clear();
    }}
  />
</div>
