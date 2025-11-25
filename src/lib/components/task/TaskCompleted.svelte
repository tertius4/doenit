<script>
  import { COMPLETE_TASK_DELAY_MS, displayDateTime } from "$lib";
  import { onMount } from "svelte";
  import { Selected } from "$lib/selected";
  import ItemName from "./ItemName.svelte";
  import InputCheckbox from "../element/input/InputCheckbox.svelte";
  import TaskDueDate from "./TaskDueDate.svelte";
  import { Categories, Sync } from "$lib/icon";
  import TaskContainer from "./TaskContainer.svelte";
  import { DateUtil } from "$lib/core/date_util";
  import { DB } from "$lib/DB";

  /**
   * @typedef {Object} Props
   * @property {Task} task
   * @property {(_: Task) => *} [onselect]
   * @property {() => *} [onclick]
   * @property {() => *} [onlongpress]
   */

  /** @type {Props & Record<string, any>} */
  const { task, onselect = () => {}, onclick = () => {}, onlongpress = () => {}, ...rest } = $props();

  const today = new Date();
  const due_date = DateUtil.parseWithTimeBoundary(task.due_date || task.start_date, "end");
  const start_date = DateUtil.parseWithTimeBoundary(task.start_date, "start");

  /** @type {Category?} */
  let category = $state(null);
  let tick_animation = $state(false);

  const is_past = $derived(!!due_date && due_date < today);
  const is_selected = $derived(Selected.tasks.has(task.id));
  const is_ongoing = $derived(!!due_date && !!start_date && today >= start_date && today <= due_date);

  onMount(async () => {
    if (!task.category_id) return;

    try {
      category = await DB.Category.getOne({ selector: { id: task.category_id, archived: { $ne: true } } });
    } catch (error) {}
  });

  /**
   * Handles the selection of a completed task.
   * @param {Event} event
   */
  function handleSelect(event) {
    event.stopPropagation();
    setTimeout(() => onselect(task), COMPLETE_TASK_DELAY_MS);
  }
</script>

<TaskContainer
  {tick_animation}
  class={{
    border: true,
    "bg-primary/20 border-primary text-alt/80": is_selected,
    "bg-card border-default text-muted": !is_selected,
  }}
  {onclick}
  {onlongpress}
>
  <ItemName name={task.name} completed={!!task.completed} {tick_animation} />

  <div class="flex flex-wrap gap-2 pl-10 font-normal">
    {#if task.due_date}
      <TaskDueDate is_complete {is_ongoing} {is_past} {is_selected} is_repeating={!!task.repeat_interval}>
        {displayDateTime({ due_date, start_date })}
      </TaskDueDate>
    {/if}

    {#if category}
      <div
        class={{
          "text-left px-1 rounded w-fit flex items-center h-fit gap-2": true,
          "bg-primary text-alt opacity-90": is_selected,
          "bg-surface": !is_selected,
        }}
      >
        <Categories class="w-sm h-sm" />
        <span>{category.name}</span>
      </div>
    {/if}
  </div>

  {#if task.completed > 1}
    <div class="absolute top-1 right-2 flex gap-1 opacity-50 font-semibold">
      <Sync class="w-sm h-sm my-auto" />
      <span>×</span>
      <span>{task.completed}</span>
    </div>
  {/if}

  <InputCheckbox bind:tick_animation is_selected onselect={handleSelect} {onlongpress} />
</TaskContainer>
