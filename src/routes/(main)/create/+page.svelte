<script>
  import SaveChanges from "$display/features/edit_task/SaveChanges.svelte";
  import EditTask from "$lib/components/EditTask.svelte";
  import { Selected } from "$lib/selected.svelte";
  import Api from "$logic/api";
  import { goto } from "$app/navigation";

  const task = $state(getTask());

  /** @returns {Domain.Task} */
  function getTask() {
    const category_id = Selected.categories.size === 1 ? Selected.categories.values().next().value : undefined;

    return Api.task.getNewTask({ category_id });
  }

  /**
   * @param {Domain.Task} task
   * @returns {AsyncResult}
   */
  async function handleCreate(task) {
    const result = await Api.task.createTask(task);
    if (!result.ok) return result;

    await goto(`/`);
    return { ok: true };
  }
</script>

<SaveChanges changed={task} onsave={handleCreate} />
<div class="mb-20">
  <EditTask {task} onsubmit={handleCreate} />
</div>
