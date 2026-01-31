<script>
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import TaskComponent from "$lib/components/task/Task.svelte";
  import { getTasksContext } from "$lib/contexts/tasks.svelte";
  import { displayPrettyDate, normalize } from "$lib";
  import { t } from "$lib/services/language.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { SvelteDate } from "svelte/reactivity";
  import { Haptics } from "@capacitor/haptics";
  import { getContext, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import Icon from "$lib/components/element/Icon.svelte";
  import { DB } from "$lib/DB";

  Selected.tasks.clear();

  const categoriesContext = getCategoriesContext();
  const tasksContext = getTasksContext();
  const current_time = new SvelteDate();

  /** @type {Value<string>}*/
  const search_text = getContext("search_text");

  const filtered_tasks = $derived(filterTasksByCategory(tasksContext.tasks, search_text.value));

  onMount(() => {
    // Calculate ms until next minute (00 seconds)
    const now = new Date();
    const ms_to_next_minute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    /** @type {NodeJS.Timeout} */
    let interval;
    const startInterval = () => {
      interval = setInterval(() => {
        current_time.setTime(Date.now());
      }, 60 * 1000);
    };

    // Set initial timeout to align with next minute
    const timeout = setTimeout(() => {
      current_time.setTime(Date.now());
      startInterval();
    }, ms_to_next_minute);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  });

  /**
   * @param {Task[]} tasks
   * @param {string | null} search_text
   * @returns {Task[]}
   */
  function filterTasksByCategory(tasks, search_text) {
    const has_search_text = !!search_text?.trim().length;
    const normalized_search = normalize(search_text ?? "");
    const default_category_id = categoriesContext.default_category?.id ?? "";

    const filtered_tasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (has_search_text) {
        const in_name = normalize(task.name).includes(normalized_search);
        if (!in_name) continue;
      }

      if (Selected.do_now) {
        const now = new Date();
        const start_date = task.start_date ? new Date(task.start_date) : null;
        start_date?.setHours(0, 0, 0, 0);

        const temp_due_date = task.due_date || task.start_date;
        const due_date = temp_due_date ? new Date(temp_due_date) : null;
        due_date?.setHours(23, 59, 59, 999);

        const is_due_date_in_future = !due_date || due_date >= now;
        const is_started = !start_date || start_date <= now;
        const is_past = due_date && due_date < now;

        const do_now = is_past || (is_started && is_due_date_in_future);
        if (!do_now) continue;
      }

      const has_cat_filter_enabled = !!Selected.categories.size;
      if (has_cat_filter_enabled) {
        const category_id = task.category_id ?? default_category_id;
        if (!Selected.categories.has(category_id)) continue;
      }

      filtered_tasks.push(task);
    }
    return filtered_tasks;
  }

  /**
   * Handles click on a task.
   * @param {Task} task
   */
  function handleClick(task) {
    if (!Selected.tasks.size) return goto(`/${task.id}`);

    if (Selected.tasks.has(task.id)) {
      Selected.tasks.delete(task.id);
    } else {
      Selected.tasks.add(task.id);
      Haptics.vibrate({ duration: 50 });
    }
  }

  /**
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
   * Handles the selection of a completed task.
   * @param {Task} task
   */
  async function handleSelect(task) {
    if (Selected.tasks.has(task.id)) {
      Selected.tasks.delete(task.id);
    } else {
      Selected.tasks.clear();
      await DB.Task.complete(task);
    }
  }
</script>

<div class="space-y-1.5">
  {#each filtered_tasks as task, i (task.id)}
    {@const display_date = displayPrettyDate(task.start_date, task.due_date)}
    {@const last_display_date = displayPrettyDate(filtered_tasks[i - 1]?.start_date, filtered_tasks[i - 1]?.due_date)}
    {@const is_same_display_date = display_date === last_display_date}

    {#if !is_same_display_date}
      {#key display_date}
        <div in:fade={{ delay: 700 }} class="text-sm font-semibold pt-1">
          {display_date}
        </div>
      {/key}
    {/if}

    {#key task.id + task.start_date}
      <TaskComponent
        {current_time}
        {task}
        onclick={() => handleClick(task)}
        onselect={() => handleSelect(task)}
        onlongpress={() => handleLongPress(task)}
      />
    {/key}
  {:else}
    <div class="flex flex-col items-center gap-4 py-12">
      {#if !Selected.categories.size}
        <div class="text-lg">{t("empty_list")}</div>
      {:else if search_text.value?.trim().length}
        <div class="text-lg">{t("no_tasks_found_for_search")}</div>
      {:else}
        <div class="text-lg">{t("no_tasks_found")}</div>
      {/if}

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
