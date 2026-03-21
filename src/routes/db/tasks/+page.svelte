<script>
  import db from "$domain/db";

  let tasks = $state(await db.task.findMany());
</script>

<pre>{JSON.stringify(tasks, null, 2)}</pre>
