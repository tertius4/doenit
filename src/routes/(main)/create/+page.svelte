<script>
  import SaveChanges from "$display/features/edit-task/SaveChanges.svelte";
  import EditTask from "$display/features/edit-task/EditTask.svelte";
  import Api from "$logic/api";
  import { navHistory } from "$logic/navigation";
  import { selected_lists } from "$display/selected.svelte";
  import { page } from "$app/state";
  import { INBOX_ID } from "$lib";

  const task = $state(getTask());

  const redirect_to = $derived(page.url.searchParams.get("redirect") || "/");

  /** @returns {Domain.Task} */
  function getTask() {
    // A list from the URL (a list's page), else the one list filtered on at home.
    const selected = selected_lists.size === 1 ? selected_lists.values().next().value : undefined;
    const list_id = page.url.searchParams.get("list_id") ?? selected;

    return Api.task.getNewTask({ list_id: list_id && list_id !== INBOX_ID ? list_id : null });
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
