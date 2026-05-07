<script>
  import View from "$display/view";
  import { onMount } from "svelte";

  /** @type {Record<string, any>[]} */
  let sync_queue = $state([]);
  onMount(() => View.db.sync_queues(sync_queue));
</script>

<pre>{JSON.stringify(sync_queue, null, 2)}</pre>
