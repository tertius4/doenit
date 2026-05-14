<script>
  import { goto } from "$app/navigation";
  import DB from "$domain/db";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { onMount } from "svelte";

  const names = DB.collectionNames;

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });
</script>

<h2 class="text-xl font-bold mb-4">DB Collections</h2>
<ul class="flex flex-col gap-1">
  <li>
    <a href="/db/context" class="text-purple-400 hover:underline font-semibold">⚡ Context / State view</a>
  </li>
  {#each names as name}
    <li>
      <a href="/db/{name}" class="text-blue-400 hover:underline">{name}</a>
    </li>
  {/each}
</ul>
