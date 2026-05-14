<script>
  import { goto } from "$app/navigation";
  import DB from "$domain/db";
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
  <div class="space-y-2">
    {#each data.records as record}
      <div class="p-2 border border-default rounded">
        <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(record, null, 2)}</pre>
        <div class="flex items-center">
          <button
            type="button"
            class="bg-amber-900 ml-auto px-2 py-1 rounded"
            onclick={() => {
              if (confirm("Are you sure you want to delete this record?")) {
                DB.getCollection(data.collection)?.remove(record.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    {:else}
      <p class="text-sm text-muted">&mdash; No records found &mdash;</p>
    {/each}
  </div>
{/if}
