<script>
  import View from "$display/view";
  import { onMount } from "svelte";

  /** @type {Record<string, any>[]} */
  let users = $state([]);
  onMount(() => View.db.users(users));
</script>

<pre>{JSON.stringify(users, null, 2)}</pre>
