<script>
  import TaskCompleted from "$lib/components/task/TaskCompleted.svelte";
  import { BACK_BUTTON_FUNCTION, normalize } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { t } from "$lib/services/language.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { Haptics } from "@capacitor/haptics";
  import { getContext, onMount } from "svelte";
  import View from "$display/view";
  import { goto } from "$app/navigation";
  import Api from "$logic/api";

  Selected.tasks.clear();

  const search_text = getContext("search_text");
  const normalized_search = $derived(normalize(search_text.value?.trim() ?? ""));

  /** @type {Task[]} */
  let all_tasks = $state([]);
  const tasks = $derived(filterTasks(all_tasks, search_text.value));

  onMount(View.tasks.taskList(all_tasks));
  onMount(() => {
    const token = backHandler.register(async () => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
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
   * @param {Task[]} tasks
   * @param {string} search_text
   * @returns {Task[]}
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
      onclick={() => handleClick(task)}
      onselect={() => Api.tasks.uncomplete(task)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    {#if normalized_search.length}
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
