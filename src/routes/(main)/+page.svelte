<script>
  import { selected_categories, selected_tasks } from "$display/selected.svelte";
  import Task from "$display/features/task-list/Task.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { getContext, onMount } from "svelte";
  import { Haptics } from "@capacitor/haptics";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import View from "$display/view";
  import { normalize } from "$lib";
  import Api from "$logic/api";

  selected_tasks.clear();

  const search_text = getContext("search_text");
  const normalized_search = $derived(normalize(search_text.value?.trim() ?? ""));

  /** @type {AL.MainPageTask[]} */
  let all_tasks = $state([]);
  
  const tasks = $derived(filterTasks(all_tasks, search_text.value));

  onMount(View.main_page.taskList(all_tasks));

  /**
   * Handles long press on a task to toggle its selection state.
   * @param {AL.MainPageTask} task
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
   * @param {AL.MainPageTask} task
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
   * @param {AL.MainPageTask[]} tasks
   * @param {string} search_text
   * @returns {AL.MainPageTask[]}
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
    <Task
      {task}
      is_selected={selected_tasks.has(task.id)}
      onclick={() => handleClick(task)}
      oncheck={() => Api.task.complete(task.id)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    <div class="flex flex-col items-center gap-4 py-12">
      <span class="text-lg">
        {#if !selected_categories.size}
          {t("empty_list")}
        {:else if search_text.value?.trim().length}
          {t("no_tasks_found_for_search")}
        {:else}
          {t("no_tasks_found")}
        {/if}
      </span>

      <button
        type="button"
        class="rounded-lg bg-card px-12 py-6 flex justify-center items-center gap-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        onclick={() => goto("/create")}
      >
        <Icon name="plus" />
        <span class="text-lg">{t("create_new_task")}</span>
      </button>
    </div>
  {/each}
</div>
