<script>
  import Heading from "$display/features/header/Heading.svelte";
  import { context } from "$logic/context.svelte";
  import { onMount } from "svelte";
  import "../../app.css";
  import { installHardwareBack, navHistory } from "$logic/navigation";
  import { afterNavigate } from "$app/navigation";
  import t from "$display/translate";

  const { children } = $props();

  onMount(() => installHardwareBack(() => t("press_again_to_exit")));

  afterNavigate((navigation) => navHistory.record(navigation));

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context._settings?.theme || "dark");
  });

  $effect(() => {
    document.documentElement.style.setProperty("--base-size", `var(--${context._settings?.text_size || "md"})`);
  });
</script>

<main
  class="h-dvh relative grid grid-rows-[auto_1fr] text-md text-normal bg-primary-900 **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <div class="relative max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow bg-primary-900 overflow-y-auto p-2">
    {@render children()}
  </div>
</main>
