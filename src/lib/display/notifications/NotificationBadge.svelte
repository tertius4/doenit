<script>
  import { unreadCount } from "$display/view/notifications";
  import { context } from "$logic/context.svelte";
  import { liveQuery } from "@tertius4/sinkro-db/svelte";

  /**
   * @typedef {Object} Props
   */

  /** @type {Props & import("svelte/elements").HTMLAttributes<HTMLSpanElement>} */
  const { ...rest } = $props();

  const unread = $derived(liveQuery(() => unreadCount(context.user?.firebase_uid ?? ""), 0));
  const count = $derived(unread.current);
</script>

{#if count}
  <span
    {...rest}
    aria-label={`${count} unread notifications`}
    class={[
      "min-w-5 h-5 px-1 rounded-full bg-error text-white text-xs font-bold flex items-center justify-center leading-none",
      rest.class || "",
    ]}
  >
    {count > 9 ? "9+" : count}
  </span>
{/if}
