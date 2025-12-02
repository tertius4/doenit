<script>
  import TaskCompleted from "$lib/components/task/TaskCompleted.svelte";
  import { Haptics } from "@capacitor/haptics";
  import { Selected } from "$lib/selected.svelte";
  import { goto } from "$app/navigation";
  import { getContext, onMount } from "svelte";
  import { DB } from "$lib/DB";
  import { t } from "$lib/services/language.svelte";
  import { BACK_BUTTON_FUNCTION, normalize } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";

  Selected.tasks.clear();

  const search_text = getContext("search_text");

  /** @type {Task[]} */
  let tasks = $state([]);
  const filtered_tasks = $derived(filterTasks(tasks, search_text.value));

  onMount(() => {
    const sub = DB.Task.subscribe((result) => (tasks = result), {
      selector: { $or: [{ archived: { $eq: true } }, { completed: { $gt: 0 } }] },
      sort: [{ completed_at: "desc" }],
    });

    return () => sub.unsubscribe();
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  /**
   * Handles long press on a task to toggle its selection state.
   * @param {Task} task
   */
  function handleLongPress(task) {
    Haptics.vibrate({ duration: 100 });
    if (Selected.tasks.has(task.id)) {
      Selected.tasks.delete(task.id);
    } else {
      Selected.tasks.add(task.id);
    }
  }

  /**
   * Handles long press on a task to toggle its selection state.
   * @param {Task} task
   */
  async function handleClick(task) {
    if (!Selected.tasks.size) return goto(`/${task.id}`);

    if (Selected.tasks.has(task.id)) {
      Selected.tasks.delete(task.id);
    } else {
      Selected.tasks.add(task.id);
      Haptics.vibrate({ duration: 50 });
    }
  }

  /**
   * Handles the selection of a completed task.
   * @param {Task} task
   */
  async function handleSelect(task) {
    await DB.Task.uncomplete(task);
  }

  /**
   * @param {Task[]} tasks
   * @param {string} search_text
   * @returns {Task[]}
   */
  function filterTasks(tasks, search_text) {
    return tasks.filter((task) => {
      if (!search_text?.trim().length) return true;

      const normalized_search = normalize(search_text);
      const in_name = normalize(task.name).includes(normalized_search);
      return !!in_name;
    });
  }
</script>

<div class="space-y-1.5">
  {#each filtered_tasks as task (task.id)}
    <TaskCompleted
      {task}
      onclick={() => handleClick(task)}
      onselect={() => handleSelect(task)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    {#if search_text.value?.trim().length}
      <div class="flex flex-col items-center gap-4 py-12">
        <div class="text-lg">{t("no_tasks_found_for_search")}</div>
      </div>
    {:else}
      <div class="flex flex-col items-center gap-4 py-12">
        <div class="text-lg">{t("no_completed_tasks")}</div>
      </div>
    {/if}
  {/each}
</div>
