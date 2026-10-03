<script>
  import { selected_categories, selected_tasks } from "$display/selected.svelte";
  import TaskGroupList from "$display/features/task-list/TaskGroupList.svelte";
  import { markCompleting } from "$display/features/task-list/task-transitions";
  import { useDelayedEmpty } from "$display/features/task-list/delayed-empty.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { getContext, onMount } from "svelte";
  import { Haptics } from "@capacitor/haptics";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import View from "$display/view";
  import { filterTasks } from "$lib";
  import Api from "$logic/api";
  import { fade } from "svelte/transition";
  import toast from "$display/toast/toast.svelte";
  import { navigating, page } from "$app/state";

  selected_tasks.clear();

  const search_text = getContext("search_text");

  /** @type {AL.MainPageTask[]} */
  let all_tasks = $state([]);

  const tasks = $derived(filterTasks(all_tasks, search_text.value, selected_categories));

  const show_empty = useDelayedEmpty(() => tasks.length);

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
   * @param {AL.MainPageTask} task
   */
  async function handleComplete(task) {
    markCompleting(task.id);
    const result = await Api.task.complete(task.id);
    if (!result.ok) return toast.error(result.error);

    selected_tasks.delete(task.id);

    return { ok: true };
  }
</script>

<div class="space-y-1.5">
  <TaskGroupList {tasks} onclick={handleClick} oncheck={handleComplete} onlongpress={handleLongPress} />

  {#if !tasks.length && show_empty.value}
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
  {/if}
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
