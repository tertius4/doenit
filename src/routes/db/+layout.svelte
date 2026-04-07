<script>
  import { context } from "$logic/context.svelte";
  import "../../app.css";

  const { children } = $props();

  $effect(() => {
    document.documentElement.setAttribute("data-theme", context.settings.theme || "dark");
  });
</script>

<div class="text-md h-dvh relative flex flex-col text-normal bg-page **:select-none **:transition-all **:duration-300">
  <main class="max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>
</div>
