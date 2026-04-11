<script>
  import BulkAssignCategory from "./BulkAssignCategory.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import ButtonShareTask from "./ButtonShareTask.svelte";
  import { slide } from "svelte/transition";
  import { on } from "svelte/events";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { onNavigate } from "$app/navigation";

  let { show = $bindable() } = $props();

  onNavigate(() => {
    show = false;
  });

  /**
   * @param {HTMLElement} node
   */
  function clickedOutside(node) {
    on(window, "click", (event) => {
      const target = /** @type {Node}  */ (event.target);
      const more_options_button = document.getElementById("meer-opsies");
      const context_menu = document.getElementById("context-menu");
      if (!node.contains(target) && !more_options_button?.contains(target) && !context_menu?.contains(target)) {
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
  {#if !!selected_tasks.size}
    <ButtonShareTask onclick={() => (show = false)} />
    <BulkAssignCategory onclose={closeBulkAssign} />
  {/if}
  <a
    aria-label={t("completed_tasks")}
    href="/complete"
    draggable="false"
    class="rounded-lg bg-card border border-default font-medium flex gap-2 items-center p-4 w-full"
  >
    <Icon name="check" size={16} />
    <span>{t("completed_tasks")}</span>
  </a>

  <a
    aria-label={t("categories")}
    draggable="false"
    href="/categories"
    class="rounded-lg bg-card border border-default font-medium flex gap-2 items-center p-4 w-full"
  >
    <Icon name="categories" size={16} />
    <span>{t("categories")}</span>
  </a>

  <a
    aria-label={t("settings")}
    draggable="false"
    href="/settings"
    class="rounded-lg bg-card border border-default font-medium flex gap-2 items-center p-4 w-full"
  >
    <Icon name="settings" size={16} />
    <span>{t("settings")}</span>
  </a>
</div>
