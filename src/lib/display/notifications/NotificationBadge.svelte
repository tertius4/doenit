<script>
  import DB from "$domain/db";
  import { context } from "$logic/context.svelte";
  import { onDestroy } from "svelte";

  /**
   * @typedef {Object} Props
   */

  /** @type {Props & import("svelte/elements").HTMLAttributes<HTMLSpanElement>} */
  const { ...rest } = $props();

  let count = $state(0);
  let unsubscribe = () => {};
  let subscribed_user_id = "";

  $effect(() => {
    const user_id = context.user?.firebase_uid ?? "";
    if (user_id === subscribed_user_id) return;

    unsubscribe();
    subscribed_user_id = user_id;
    count = 0;

    if (!user_id) return;

    const subscription = DB.notification.subscribe$(DB.notification.unreadQuery(user_id)).subscribe((items) => {
      count = items.length;
    });
    unsubscribe = () => subscription.unsubscribe();
  });

  onDestroy(() => unsubscribe());
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
