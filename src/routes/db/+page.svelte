<script>
  import DB from "$domain/db";
  import { backHandler, navHistory } from "$logic/navigation";
  import { onMount } from "svelte";

  const names = DB.collectionNames;

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
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
