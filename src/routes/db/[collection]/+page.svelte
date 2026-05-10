<script>
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation/BackHandler.svelte.js";
  import { onMount } from "svelte";

  const { data } = $props();

  onMount(() => {
    const token = backHandler.register(() => goto(`/db`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });
</script>

<h2 class="text-xl font-bold my-4">{data.collection}</h2>
{#if data.error}
  <pre class="text-red-400 text-sm">{data.error}</pre>
{:else}
  <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data.records, null, 2)}</pre>
{/if}
