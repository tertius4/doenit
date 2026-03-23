<script>
  import SaveChanges from "$display/features/edit_task/SaveChanges.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import { ButtonDelete } from "$display/features/edit_task";
  import EditTask from "$lib/components/EditTask.svelte";
  import t from "$display/translate";
  import { alert } from "$lib/core/alert.js";
  import Api from "$logic/api";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  const task = $state(await getTask());
  let archived = $state(!!task.archived);

  /**
   * @returns {Promise<Task>}
   */
  async function getTask() {
    const result = await Api.task.getTaskById(page.params.item_id);
    if (result.ok) return result.value;

    await goto("/create", { replaceState: true });
    alert.error(result.error);
    throw "redirected";
  }

  /**
   * @param {Task} task
   * @returns {AsyncResult}
   */
  async function handleUpdateTask(task) {
    task.archived = archived;
    const result = await Api.task.updateTask(task);
    if (!result.ok) return result;

    await goto("/");
    return { ok: true };
  }

  /**
   * @returns {AsyncResult}
   */
  async function deleteTask() {
    const result = await Api.task.deleteTask(task.id);
    if (!result.ok) return result;

    await goto("/");
    return { ok: true };
  }

  async function handleSelectTask() {
    archived = !archived;
  }
</script>

<ButtonDelete ondelete={deleteTask} class="fixed top-4.5 right-4.5 " />
<SaveChanges task_id={task.id} changed={task} onsave={handleUpdateTask} />

<div class="mb-20">
  <EditTask {task} onsubmit={handleUpdateTask} />

  <div class="h-12 flex">
    <div class="font-bold text-left my-auto w-full">{t("complete")}</div>

    <InputCheckbox
      class="static! top-0! translate-0! left-0! bottom-0! right-0! p-2! z-1"
      onselect={handleSelectTask}
      is_selected={!!task.archived}
      tick_animation={!!task.archived}
    />
  </div>
</div>
