<script>
  import SaveChanges from "$display/features/edit-task/SaveChanges.svelte";
  import EditTask from "$display/features/edit-task/EditTask.svelte";
  import Api from "$logic/api";
  import { navHistory } from "$logic/navigation";
  import { selected_categories } from "$display/selected.svelte";
  import { page } from "$app/state";

  const task = $state(getTask());

  const redirect_to = $derived(page.url.searchParams.get("redirect") || "/");

  /** @returns {Domain.Task} */
  function getTask() {
    const category_id = selected_categories.size === 1 ? selected_categories.values().next().value : undefined;
    const scope_id = page.url.searchParams.get("scope_id") ?? undefined;

    return Api.task.getNewTask({ category_id, scope_id });
  }

  /**
   * @param {Domain.Task} task
   * @returns {AsyncResult}
   */
  async function handleCreate(task) {
    const result = await Api.task.createTask(task);
    if (!result.ok) return result;

    // A task without dates is not a "Do Now" task, so show all tasks to keep the new one visible.
    if (!task.start_date && !task.due_date) await Api.settings.setHomeMode("all");

    navHistory.back(redirect_to);
    return { ok: true };
  }

  /**
   * @returns {AsyncResult}
   */
  async function handleCancel() {
    navHistory.back(redirect_to);
    return { ok: true };
  }
</script>

<SaveChanges changed={task} onsave={handleCreate} oncancel={handleCancel} />
<div class="mb-20">
  <EditTask {task} onsubmit={handleCreate} />
</div>
