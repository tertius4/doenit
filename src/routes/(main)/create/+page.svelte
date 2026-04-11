<script>
  import SaveChanges from "$display/features/edit-task/SaveChanges.svelte";
  import EditTask from "$display/features/edit-task/EditTask.svelte";
  import Api from "$logic/api";
  import { goto } from "$app/navigation";
  import { selected_categories } from "$display/selected.svelte";

  const task = $state(getTask());

  /** @returns {Domain.Task} */
  function getTask() {
    const category_id = selected_categories.size === 1 ? selected_categories.values().next().value : undefined;

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

  /**
   * @returns {AsyncResult}
   */
  async function handleCancel() {
    await goto(`/`);
    return { ok: true };
  }
</script>

<SaveChanges changed={task} onsave={handleCreate} oncancel={handleCancel} />
<div class="mb-20">
  <EditTask {task} onsubmit={handleCreate} />
</div>
