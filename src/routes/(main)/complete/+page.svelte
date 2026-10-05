<script>
  import TaskCompleted from "$display/features/task-list/TaskCompleted.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import { normalize } from "$lib";
  import { backHandler, navHistory } from "$logic/navigation";
  import { Haptics } from "@capacitor/haptics";
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import View from "$display/view";
  import Api from "$logic/api";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";

  selected_tasks.clear();

  const search_text = getContext("search_text");
  const normalized_search = $derived(normalize(search_text.value?.trim() ?? ""));

  /** @type {AL.DonePageTask[]} */
  let completed_tasks = $state([]);
  
  const tasks = $derived(filterTasks(completed_tasks, search_text.value));

  onMount(View.done_page.taskList(completed_tasks));
  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });

  let is_deleting_all = $state(false);

  async function deleteAllDone() {
    const result = await Api.task.deleteAll({ ids: completed_tasks.map((task) => task.id) });
    if (!result.ok) toast.error(result.error);

    is_deleting_all = false;
  }

  /**
   * Handles long press on a task to toggle its selection state.
   * @param {AL.DonePageTask} task
   */
  function handleLongPress(task) {
    Haptics.vibrate({ duration: 100 });
    if (selected_tasks.has(task.id)) {
      selected_tasks.delete(task.id);
    } else {
      selected_tasks.add(task.id);
    }
  }

  /**
   * Handles click on a task to toggle its selection state or navigate to the task.
   * @param {AL.DonePageTask} task
   */
  async function handleClick(task) {
    if (!selected_tasks.size) return goto(`/${task.id}`);

    if (selected_tasks.has(task.id)) {
      selected_tasks.delete(task.id);
    } else {
      selected_tasks.add(task.id);
      Haptics.vibrate({ duration: 50 });
    }
  }

  /**
   * @param {AL.DonePageTask[]} tasks
   * @param {string} search_text
   * @returns {AL.DonePageTask[]}
   */
  function filterTasks(tasks, search_text) {
    return tasks.filter((task) => {
      if (!search_text?.trim().length) return true;

      return normalize(task.name).includes(normalized_search);
    });
  }
</script>

<div class="space-y-1.5">
  {#each tasks as task (task.id)}
    <TaskCompleted
      {task}
      is_selected={selected_tasks.has(task.id)}
      onclick={() => handleClick(task)}
      oncheck={() => Api.task.uncomplete(task.id)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    <div class="flex flex-col items-center gap-4 py-12">
      <span class="text-lg">
        {#if normalized_search.length}
          {t("no_tasks_found_for_search")}
        {:else}
          {t("no_completed_tasks")}
        {/if}
      </span>
    </div>
  {/each}

  {#if completed_tasks.length}
    <button
      type="button"
      onclick={() => (is_deleting_all = true)}
      class="w-full mt-4 h-12 bg-card border border-default rounded-md flex items-center justify-center gap-2 text-error"
    >
      <Icon name="trash" size={20} />
      <span>{t("delete_all_done")}</span>
    </button>
  {/if}
</div>

<Modal bind:is_open={is_deleting_all} onclose={() => (is_deleting_all = false)} class="*:space-y-4" onsubmit={deleteAllDone}>
  <ModalHeader>{t("delete_all_done")}</ModalHeader>
  <p>{t("delete_all_done_confirmation")}</p>

  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md">
    <Icon name="trash" size={28} class="h-full" />
    <span>{t("delete")}</span>
  </button>
</Modal>
