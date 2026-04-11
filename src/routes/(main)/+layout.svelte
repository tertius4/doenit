<script>
  import Footer from "$display/features/footer/Footer.svelte";
  import Heading from "$display/features/header/Heading.svelte";
  import { context } from "$logic/context.svelte";
  import { setContext } from "svelte";
  import "../../app.css";

  const search_text = $state({ value: "" });
  setContext("search_text", search_text);

  const { children } = $props();

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context.settings.theme || "dark");
  });

  $effect(() => {
    document.documentElement.style.setProperty("--base-size", `var(--${context.settings.text_size || "md"})`);
  });
</script>

<main
  class="h-dvh relative grid grid-rows-[auto_1fr_auto] text-md text-normal bg-page **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <div class="relative max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow bg-page overflow-y-auto p-2">
    {@render children()}
  </div>

  <Footer />
</main>
