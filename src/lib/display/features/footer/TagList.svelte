<script>
  import { Haptics } from "@capacitor/haptics";
  import Tag from "$display/comps/button/Tag.svelte";
  import { goto } from "$app/navigation";
  import { selected_lists } from "$display/selected.svelte";

  /**
   * A list filter on the home page. A long press opens the list.
   *
   * @typedef {Object} Props
   * @prop {AL.ListOption} list
   */

  /** @type {Props} */
  const { list } = $props();

  const is_selected = $derived(selected_lists.has(list.id));

  function toggle() {
    if (selected_lists.has(list.id)) {
      selected_lists.delete(list.id);
    } else {
      selected_lists.add(list.id);
    }
  }

  function handleLongPress() {
    Haptics.vibrate({ duration: 100 });
    goto(`/lists/${list.id}`);
  }
</script>

<!-- whitespace-nowrap in Tag keeps the name on one line (Tailwind 4's text-nowrap is text-wrap, which
     iOS Safari before 17.4 ignores); max-w + truncate cap long names with an ellipsis. -->
<Tag class={["max-w-40", list.task_count != null ? "pr-1!" : ""]} {is_selected} onclick={toggle} onlongpress={handleLongPress}>
  <span class="truncate min-w-0">{list.name}</span>
  {#if list.task_count != null}
    <div
      class={{
        "rounded-full px-2 shrink-0 flex items-center justify-center": true,
        "h-fit aspect-square": list.task_count < 10,
        "h-full": list.task_count >= 10,
        "bg-secondary-600 text-alt": is_selected,
        "bg-surface text-muted": !is_selected,
      }}
    >
      <span class="font-light font-mono text-sm">{list.task_count}</span>
    </div>
  {/if}
</Tag>
