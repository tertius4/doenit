<script>
  import View from "$display/view";
  import Task from "$lib/components/task/Task.svelte";
  import { alert } from "$lib/core/alert";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";

  /** @type {Logic.MainPageTask[]} */
  let tasks = $state([]);

  View.tasks.taskList(tasks);
</script>

{#each tasks as task}
  <Task 
{/each}


