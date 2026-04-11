<script>
  import View from "$display/view";
  import { onMount } from "svelte";

  /** @type {Record<string, any>[]} */
  let categories = $state([]);
  onMount(() => View.db.category(categories));
</script>

<pre>{JSON.stringify(categories, null, 2)}</pre>
