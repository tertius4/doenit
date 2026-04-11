<script>
  import DB from "$domain/db";

  /** @type {Record<string, any>[]} */
  let tasks = $state(await DB.task.findMany().then((result) => (result.ok ? result.value : [])));
</script>

<pre>{JSON.stringify(tasks, null, 2)}</pre>
