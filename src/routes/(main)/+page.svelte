<script>
  import { selected_categories, selected_tasks } from "$display/selected.svelte";
  import CardTask from "$display/features/task-list/CardTask.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { getContext, onMount } from "svelte";
  import { Haptics } from "@capacitor/haptics";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import View from "$display/view";
  import { normalize, wait } from "$lib";
  import Api from "$logic/api";
  import { fade } from "svelte/transition";
  import toast from "$display/toast/toast.svelte";
  import { navigating, page } from "$app/state";

  selected_tasks.clear();

  const search_text = getContext("search_text");
  const normalized_search = $derived(normalize(search_text.value?.trim() ?? ""));

  /** @type {AL.MainPageTask[]} */
  let all_tasks = $state([]);

  const tasks = $derived(filterTasks(all_tasks, normalized_search, selected_categories));

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
   * @param {Set<string>} selected_categories
   * @returns {AL.MainPageTask[]}
   */
  function filterTasks(tasks, search_text, selected_categories) {
    return tasks.filter((task) => {
      const matches_search = normalize(task.name).includes(search_text);
      const matches_category = !selected_categories.size || selected_categories.has(task.category_id || "default");
      return matches_search && matches_category;
    });
  }

  /**
   * @param {AL.MainPageTask} task
   */
  async function handleComplete(task) {
    const task_element = document.getElementById(`task-${task.id}`);
    console.log("task_element", task_element);
    if (task_element) task_element.className += " animate-complete";
    await wait(200);
    const result = await Api.task.complete(task.id);
    if (!result.ok) return toast.error(result.error);

    // Remove animation
    if (task_element) task_element.className = task_element.className.replace(" animate-complete", "");

    selected_tasks.delete(task.id);

    return { ok: true };
  }
</script>

<div class="space-y-1.5">
  {#each tasks as task (task.id)}
    <CardTask
      {task}
      is_selected={selected_tasks.has(task.id)}
      onclick={() => handleClick(task)}
      oncheck={() => handleComplete(task)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    <div class="flex flex-col items-center gap-4 py-12" in:fade={{ delay: 150 }}>
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

<!-- FAB -->
<button
  type="button"
  onclick={() => goto("/create")}
  class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
  style="bottom: calc(136px + env(safe-area-inset-bottom)); "
  aria-label="Add task"
>
  {#if navigating.to}
    <Icon name="loading" class={{ "animate-spin text-2xl": true, "text-white": !!page.data.is_home }} />
  {:else}
    <Icon name="plus" class={{ "text-2xl": true, "text-white": !!page.data.is_home }} />
  {/if}
</button>
