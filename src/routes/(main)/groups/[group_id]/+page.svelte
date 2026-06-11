<script>
  import CardTask from "$display/features/task-list/CardTask.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { selected_categories, selected_tasks } from "$display/selected.svelte";
  import { Haptics } from "@capacitor/haptics";
  import { goto } from "$app/navigation";
  import { getContext, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { BACK_BUTTON_FUNCTION, filterTasks, wait } from "$lib";
  import { backHandler } from "$logic/navigation";
  import View from "$display/view";
  import Api from "$logic/api";
  import t from "$display/translate";
  import toast from "$display/toast/toast.svelte";

  const { data } = $props();

  selected_tasks.clear();
  const groupTitles = [
    t("past"),
    t("today"),
    t("tomorrow"),
    t("day_after_tomorrow"),
    t("in_a_week"),
    t("in_a_month"),
    t("later"),
    t("no_date"),
  ];
  const search_text = getContext("search_text");

  /** @type {AL.MainPageTask[]} */
  let all_tasks = $state([]);
  const tasks = $derived(filterTasks(all_tasks, search_text.value, selected_categories));

  onMount(() => {
    const token = backHandler.register(() => goto("/groups"), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(() => View.group_tasks.taskList(data.group.id, all_tasks));

  /**
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
   * @param {AL.MainPageTask} task
   */
  async function handleClick(task) {
    if (!selected_tasks.size) return goto(`/${task.id}?redirect=/groups/${data.group.id}`);
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
    const task_element = document.getElementById(`task-${task.id}`);
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

<div class="space-y-1.5 mt-2">
  {#each tasks as task, index (task.id)}
    {@const group = task.time_group_number}
    {@const previousGroup = index > 0 ? tasks[index - 1].time_group_number : -1}

    {#if group !== previousGroup}
      <h2 class="mb-2 text-lg font-semibold">
        {groupTitles[group]}
      </h2>
    {/if}

    <CardTask
      {task}
      is_selected={selected_tasks.has(task.id)}
      onclick={() => handleClick(task)}
      oncheck={() => handleComplete(task)}
      onlongpress={() => handleLongPress(task)}
    />
  {:else}
    <div class="flex flex-col items-center gap-4 py-12" in:fade={{ delay: 150 }}>
      <span class="text-lg">{t("empty_list")}</span>
      <button
        type="button"
        class="rounded-lg bg-card px-12 py-6 flex justify-center items-center gap-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        onclick={() => goto(`/create?scope_id=${data.group.id}&redirect=/groups/${data.group.id}`)}
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
  onclick={() => goto(`/create?scope_id=${data.group.id}&redirect=/groups/${data.group.id}`)}
  class="fixed right-4 z-30 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
  style="bottom: calc(89px + env(safe-area-inset-bottom));"
  aria-label="Add task"
>
  <Icon name="plus" class="text-2xl text-white" />
</button>
