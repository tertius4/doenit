<script>
  import { user } from "$lib/core/user.svelte";
  import "../../app.css";

  const { children } = $props();
</script>

<svelte:window onload={() => document.documentElement.setAttribute("data-theme", user.theme)} />

<div class="text-md h-dvh relative flex flex-col text-normal bg-page **:select-none **:transition-all **:duration-300">
  <main class="max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>
</div>
