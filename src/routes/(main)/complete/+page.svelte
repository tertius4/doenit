<script>
  import TaskCompleted from "$display/features/task-list/TaskCompleted.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import { BACK_BUTTON_FUNCTION, normalize } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { Haptics } from "@capacitor/haptics";
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import View from "$display/view";
  import Api from "$logic/api";

  selected_tasks.clear();

  const search_text = getContext("search_text");
  const normalized_search = $derived(normalize(search_text.value?.trim() ?? ""));

  /** @type {AL.DonePageTask[]} */
  let completed_tasks = $state([]);
  
  const tasks = $derived(filterTasks(completed_tasks, search_text.value));

  onMount(View.done_page.taskList(completed_tasks));
  onMount(() => {
    const token = backHandler.register(async () => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

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
</div>
