<script>
  import BulkAssignCategory from "./BulkAssignCategory.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import ButtonShareTask from "./ButtonShareTask.svelte";
  import { slide } from "svelte/transition";
  import { on } from "svelte/events";

  let { show = $bindable() } = $props();

  /**
   * @param {HTMLElement} node
   */
  function clickedOutside(node) {
    on(window, "click", (event) => {
      const target = /** @type {Node}  */ (event.target);
      if (!node.contains(target)) {
        show = false;
      }
    });
  }

  function closeBulkAssign() {
    selected_tasks.clear();
    show = false;
  }
</script>

<div
  {@attach clickedOutside}
  id="context-menu"
  transition:slide
  class="absolute right-4 w-75 max-w-[90%] top-16 bg-surface rounded-lg shadow-lg border border-default z-50 p-2 space-y-2"
>
  <ButtonShareTask onclick={() => (show = false)} />
  <BulkAssignCategory onclose={closeBulkAssign} />
</div>

