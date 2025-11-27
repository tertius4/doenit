<script>
  import { displayPrettyDate, normalize, sortTasksByDueDate } from "$lib";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import TaskComponent from "$lib/components/task/Task.svelte";
  import { getContext, onMount, tick } from "svelte";
  import { goto, pushState } from "$app/navigation";
  import { t } from "$lib/services/language.svelte";
  import { SvelteDate } from "svelte/reactivity";
  import { navigating, page } from "$app/state";
  import { Haptics } from "@capacitor/haptics";
  import { fade } from "svelte/transition";
  import { Selected } from "$lib/selected.svelte";
  import { Alert } from "$lib/core/alert";
  import { Plus } from "$lib/icon";
  import { DB } from "$lib/DB";

  Selected.tasks.clear();

  const categoriesContext = getCategoriesContext();

  /** @type {Task[]} */
  let tasks = $state([]);
  let current_time = new SvelteDate();

  /** @type {Value<string>}*/
  const search_text = getContext("search_text");

  const filtered_tasks = $derived(filterTasksByCategory(tasks, search_text.value));

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

  onMount(() => {
    const sub = DB.Task.subscribe((result) => (tasks = sortTasksByDueDate(result)), {
      selector: { archived: { $ne: true } },
    });

    return () => sub.unsubscribe();
  });

  onMount(async () => {
    await tick(); // Make sure router is initialized.

    const { searchParams, origin, pathname } = page.url;
    const task_id = navigating.from?.params?.item_id || searchParams.get("new_id");
    if (!!task_id) scrollToTask(task_id);

    const completed_task_ids = searchParams.get("completed_task_ids");
    if (!!completed_task_ids) {
      const task_ids = completed_task_ids.split(",");
      const unique_task_ids = [...new Set(task_ids)];
      const tasks = await DB.Task.getAll({ selector: { id: { $in: unique_task_ids } } });
      const promises = tasks.map(async (task) => {
        await DB.Task.complete(task);
      });

      await Promise.all(promises).catch(() => Alert.error("Kon nie take as voltooi gemerk nie."));
    }

    // Update the URL without reloading the page
    searchParams.delete("new_id");
    searchParams.delete("completed_task_ids");
    const url_search = !!searchParams.size ? `${page.url.search}` : "";
    const new_url = `${origin}${pathname}${url_search}`;
    pushState(new_url, {});
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

        const is_available = !start_date || (!!start_date && start_date <= now && due_date >= now);
        if (!is_available) continue;
      } else {
        const has_cat_filter_enabled = !!Selected.categories.size;
        if (has_cat_filter_enabled) {
          const category_id = task.category_id ?? default_category_id;
          if (!Selected.categories.has(category_id)) continue;
        }
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

  /**
   * @param {string} task_id
   */
  function scrollToTask(task_id) {
    const element = document.getElementById(task_id);
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }
</script>

<div class="space-y-1.5">
  {#each filtered_tasks as task, i (task.id)}
    {@const display_date = displayPrettyDate(task.start_date, task.due_date)}
    {@const last_display_date = displayPrettyDate(filtered_tasks[i - 1]?.start_date, filtered_tasks[i - 1]?.due_date)}
    {@const is_same_display_date = display_date === last_display_date}

    {#if !is_same_display_date}
      {#key display_date}
        <div in:fade={{ delay: 700 }} class="text-sm font-semibold pt-1 text-t-secondary">
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
        <Plus />
        <span class="text-lg">{t("create_new_task")}</span>
      </button>
    </div>
  {/each}
</div>
