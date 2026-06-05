<script>
  import ButtonDelete from "$display/features/edit-task/ButtonDelete.svelte";
  import SaveChanges from "$display/features/edit-task/SaveChanges.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import EditTask from "$display/features/edit-task/EditTask.svelte";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { page } from "$app/state";

  const { data } = $props();

  // svelte-ignore state_referenced_locally
  let task = $state(data.task);
  let archived = $state(!!task.archived);

  const redirect_to = $derived(page.url.searchParams.get("redirect") || "/");

  /**
   * @param {DB.Task} task
   * @returns {AsyncResult}
   */
  async function handleUpdateTask(task) {
    task.archived = archived;
    const result = await Api.task.updateTask(task);
    if (!result.ok) return result;

    await goto(redirect_to);
    return { ok: true };
  }

  /**
   * @returns {AsyncResult}
   */
  async function deleteTask() {
    const result = await Api.task.deleteTask(task.id);
    if (!result.ok) return result;

    await goto(redirect_to);
    return { ok: true };
  }

  /**
   * @param {boolean} value
   */
  async function handleSelectTask(value) {
    archived = value;
  }

  /**
   * @returns {AsyncResult}
   */
  async function handleCancel() {
    await goto(redirect_to);
    return { ok: true };
  }
</script>

<ButtonDelete
  ondelete={deleteTask}
  class="fixed p-4"
  style="top: env(safe-area-inset-top); right: env(safe-area-inset-right);"
/>
<SaveChanges task_id={task.id} changed={task} onsave={handleUpdateTask} oncancel={handleCancel} />

<div class="mb-20">
  <EditTask {task} onsubmit={handleUpdateTask} />

  <div class="h-8 flex">
    <div class="font-bold text-left my-auto w-full">{t("complete")}</div>

    <InputCheckbox onchange={handleSelectTask} checked={!!archived} class="my-auto" />
  </div>
</div>
