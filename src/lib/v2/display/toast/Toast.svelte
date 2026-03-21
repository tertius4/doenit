<script>
  import Icon from "$display/comps/Icon.svelte";
  import { slide } from "svelte/transition";
  import Toast from "./toast.svelte";

  const { toast } = $props();

  // svelte-ignore state_referenced_locally
  let remaining = $state(toast.duration ?? 0);
  /** @type {NodeJS.Timeout | null}*/
  let timer = $state(null);
  /** @type {number} */
  let start = $state(0);

  function startTimer() {
    if (!toast.duration) return;

    start = Date.now();
    timer = setTimeout(async () => await Toast.remove(toast.id), remaining);
  }

  $effect(() => {
    startTimer();
    return () => {
      if (timer) clearTimeout(timer);
    };
  });

  /** @type {Record<string, string>} */
  const background_tint_chart = {
    success: "opacity-20 bg-green-500",
    error: "opacity-20 bg-red-500",
    info: "opacity-20 bg-blue-500",
    warning: "opacity-20 bg-yellow-500",
  };

  /** @type {Record<string, string>} */
  const border_chart = {
    success: "border-green-500",
    error: "border-red-500",
    info: "border-blue-500",
    warning: "border-yellow-500",
  };

  const bg_tint_classes = $derived(background_tint_chart[toast.type]);
  const border_classes = $derived(border_chart[toast.type]);
</script>

<div
  transition:slide
  role="status"
  aria-live="polite"
  class="relative bg-card text-alt w-full rounded-md shadow-lg p-4 border {border_classes}"
>
  <div class="absolute top-0 left-0 right-0 bottom-0 rounded-md {bg_tint_classes}"></div>
  {#if toast.title}
    <div class="pointer-events-none select-none font-semibold">{toast.title}</div>
  {/if}

  <div class="pointer-events-none select-none text-sm opacity-90">{toast.body}</div>

  <button type="button" class="absolute top-0 right-0 p-1 text-alt" onclick={async () => await Toast.remove(toast.id)}>
    <Icon name="times" size={18} />
  </button>
</div>
