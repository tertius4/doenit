<script>
  import { selected_tasks } from "$display/selected.svelte";
  import t from "$display/translate";
  import CardTask from "./CardTask.svelte";
  import { taskIn, taskOut } from "./task-transitions";

  /**
   * @typedef {Object} Props
   * @prop {AL.MainPageTask[]} tasks - Tasks sorted by time group.
   * @prop {(task: AL.MainPageTask) => void} onclick
   * @prop {(task: AL.MainPageTask) => void} oncheck
   * @prop {(task: AL.MainPageTask) => void} onlongpress
   */

  /** @type {Props} */
  const { tasks, onclick, oncheck, onlongpress } = $props();

  const group_titles = [
    t("past"),
    t("today"),
    t("tomorrow"),
    t("day_after_tomorrow"),
    t("in_a_week"),
    t("in_a_month"),
    t("later"),
    t("no_date"),
  ];

  const groups = $derived.by(() => {
    /** @type {{ number: number, tasks: AL.MainPageTask[] }[]} */
    const result = [];
    for (const task of tasks) {
      const last = result[result.length - 1];
      if (last && last.number === task.time_group_number) last.tasks.push(task);
      else result.push({ number: task.time_group_number, tasks: [task] });
    }
    return result;
  });
</script>

<div class="space-y-1.5">
  {#each groups as group (group.number)}
    <div class="space-y-1.5">
      <h2 class="mb-2 text-lg font-semibold" out:taskOut|global in:taskIn|global>
        {group_titles[group.number]}
      </h2>

      {#each group.tasks as task (task.id)}
        <CardTask
          {task}
          is_selected={selected_tasks.has(task.id)}
          onclick={() => onclick(task)}
          oncheck={() => oncheck(task)}
          onlongpress={() => onlongpress(task)}
        />
      {/each}
    </div>
  {/each}
</div>
