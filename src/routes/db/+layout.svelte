<script>
  import Heading from "$display/features/header/Heading.svelte";
  import { context } from "$logic/context.svelte";
  import { onMount } from "svelte";
  import "../../app.css";
  import { Capacitor } from "@capacitor/core";
  import { App } from "@capacitor/app";
  import { backHandler } from "$logic/navigation";

  const { children } = $props();

  onMount(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => backHandler.handle());
    return () => listener.then((l) => l.remove());
  });

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context.settings.theme || "dark");
  });

  $effect(() => {
    document.documentElement.style.setProperty("--base-size", `var(--${context.settings.text_size || "md"})`);
  });
</script>

<main
  class="h-dvh relative grid grid-rows-[auto_1fr] text-md text-normal bg-page **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <div class="relative max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow bg-page overflow-y-auto p-2">
    {@render children()}
  </div>
</main>
