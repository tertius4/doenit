<script>
  import ButtonDelete from "$display/features/edit-task/ButtonDelete.svelte";
  import SaveChanges from "$display/features/edit-task/SaveChanges.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import EditTask from "$display/features/edit-task/EditTask.svelte";
  import { navHistory } from "$logic/navigation";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { page } from "$app/state";
  import DateUtil from "$display/date-util";
  import { context } from "$logic/context.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import { goto } from "$app/navigation";

  const { data } = $props();

  // svelte-ignore state_referenced_locally
  let task = $state(data.task);
  // svelte-ignore state_referenced_locally
  let archived = $state(!!task.archived);

  let is_converting = $state(false);
  let is_busy = $state(false);
  /** The name of the list the task leaves when it becomes a project, for the warning. */
  let list_name = $state("");

  const redirect_to = $derived(page.url.searchParams.get("redirect") || "/");

  /**
   * @param {DB.Task} task
   * @returns {AsyncResult}
   */
  async function handleUpdateTask(task) {
    task.archived = archived;
    const result = await Api.task.updateTask(task);
    if (!result.ok) return result;

    navHistory.back(redirect_to);
    return { ok: true };
  }

  /**
   * @returns {AsyncResult}
   */
  async function deleteTask() {
    const result = await Api.task.deleteTask(task.id);
    if (!result.ok) return result;

    navHistory.back(redirect_to);
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
    navHistory.back(redirect_to);
    return { ok: true };
  }

  async function openConvert() {
    list_name = "";
    is_converting = true;
    if (!task.list_id) return;
    const list = await Api.lists.getById(task.list_id);
    if (list.ok) list_name = list.value.name;
  }

  /** Saves what is in the form first, so the project gets the items as they are now. */
  async function convertToProject() {
    if (is_busy) return;
    is_busy = true;
    task.archived = archived;
    const saved = await Api.task.updateTask(task);
    const result = saved.ok ? await Api.lists.convertTask(saved.value.id) : saved;
    is_busy = false;
    if (!result.ok) return toast.error(result.error);

    is_converting = false;
    goto(`/lists/${result.value.id}`, { replaceState: true });
  }

  /**
   * @param {string} timestamp
   */
  function formatDate(timestamp) {
    const locale = context.settings.language == "en" ? "en-GB" : "af-ZA";
    return DateUtil.format(timestamp, "D MMM YYYY, HH:mm", { locale });
  }
</script>

<ButtonDelete
  ondelete={deleteTask}
  class="fixed p-4"
  style="top: env(safe-area-inset-top); right: env(safe-area-inset-right);"
/>
<SaveChanges task_id={task.id} changed={task} onsave={handleUpdateTask} oncancel={handleCancel} />

<div class="mb-20">
  <EditTask bind:task onsubmit={handleUpdateTask} />

  <div class="h-8 flex">
    <div class="font-bold text-left my-auto w-full">{t("complete")}</div>

    <InputCheckbox onchange={handleSelectTask} checked={!!archived} class="my-auto" />
  </div>

  {#if task.checklist?.length}
    <button
      type="button"
      onclick={openConvert}
      class="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-default h-12 font-medium"
    >
      <Icon name="folder" size={18} />
      {t("convert_to_project")}
    </button>
  {/if}

  <div class="ml-auto w-fit mt-4 text-xs text-muted space-y-0.5">
    <p class="w-fit">{t("created_at")}: {formatDate(task.created_at)}</p>
    <p class="w-fit">{t("updated_at")}: {formatDate(task.updated_at)}</p>
  </div>
</div>

<Modal bind:is_open={is_converting} class="*:space-y-4">
  <ModalHeader>{t("convert_to_project")}</ModalHeader>
  <p>{t("convert_to_project_body", { count: task.checklist?.length ?? 0 })}</p>
  {#if task.list_id}
    <p class="text-warning">
      {list_name ? t("convert_leaves_list", { list: list_name }) : t("convert_leaves_list_unnamed")}
      {task.scope_id ? t("convert_same_members") : ""}
    </p>
  {/if}
  <button
    type="button"
    disabled={is_busy}
    class="bg-primary text-white flex gap-1 items-center ml-auto px-4 py-2 rounded-md disabled:opacity-50"
    onclick={convertToProject}
  >
    <Icon name="folder" />
    <span>{t("convert")}</span>
  </button>
</Modal>
