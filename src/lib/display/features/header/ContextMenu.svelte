<script>
  import BulkAssignCategory from "./BulkAssignCategory.svelte";
  import { PUBLIC_DEV_EMAILS } from "$env/static/public";
  import { selected_tasks } from "$display/selected.svelte";
  import ButtonShareTask from "./ButtonShareTask.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { onNavigate } from "$app/navigation";
  import { slide } from "svelte/transition";
  import { on } from "svelte/events";
  import t from "$display/translate";
  import { context } from "$logic/context.svelte";

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
  class="absolute right-4 w-72 max-w-[90%] top-16 bg-surface rounded-xl shadow-xl border border-default z-50 overflow-hidden"
>
  {#if !!selected_tasks.size}
    <div class="p-2 space-y-1 border-b border-default">
      <ButtonShareTask onclick={() => (show = false)} />
      <BulkAssignCategory onclose={closeBulkAssign} />
    </div>
  {/if}

  <div class="p-2 space-y-0.5">
    <a
      aria-label={t("completed_tasks")}
      href="/complete"
      draggable="false"
      class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
    >
      <Icon name="check" size={16} />
      <span>{t("completed_tasks")}</span>
    </a>

    <a
      aria-label={t("categories")}
      draggable="false"
      href="/categories"
      class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
    >
      <Icon name="categories" size={16} />
      <span>{t("categories")}</span>
    </a>

    <a
      aria-label={t("settings")}
      draggable="false"
      href="/settings"
      class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
    >
      <Icon name="settings" size={16} />
      <span>{t("settings")}</span>
    </a>

    {#if context.user && PUBLIC_DEV_EMAILS.includes(context.user?.email_address)}
      <a
        aria-label={t("database")}
        draggable="false"
        href="/db"
        class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
      >
        <Icon name="database" size={16} />
        <span>{t("database")}</span>
      </a>
    {/if}
  </div>
</div>
