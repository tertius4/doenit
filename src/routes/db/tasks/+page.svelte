<script>
  import View from "$display/view";
  import { onMount } from "svelte";

  /** @type {Record<string, any>[]} */
  let tasks = $state([]);
  onMount(() => View.db.tasks(tasks));
</script>

<pre>{JSON.stringify(tasks, null, 2)}</pre>
