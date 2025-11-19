<script>
  import { Camera, Categories, Clock, Important, Sync, Users } from "$lib/icon";
  import InputCheckbox from "../element/input/InputCheckbox.svelte";
  import { COMPLETE_TASK_DELAY_MS, displayDateTime } from "$lib";
  import TaskContainer from "./TaskContainer.svelte";
  import { Selected } from "$lib/selected";
  import ItemName from "./ItemName.svelte";
  import DateUtil from "$lib/DateUtil";
  import { onMount } from "svelte";
  import Pill from "./Pill.svelte";
  import { DB } from "$lib/DB";

  /**
   * @typedef {Object} Props
   * @property {import("svelte/reactivity").SvelteDate} current_time
   * @property {Task} task
   * @property {(_: Task) => *} [onselect]
   * @property {() => *} [onclick]
   * @property {() => *} [onlongpress]
   */

  /** @type {Props & Record<string, any>} */
  const { current_time, task, onselect = () => {}, onclick = () => {}, onlongpress = () => {}, ...rest } = $props();

  const due_date = DateUtil.parseWithTimeBoundary(task.due_date, "end");
  const start_date = DateUtil.parseWithTimeBoundary(task.start_date, !!due_date ? "start" : "end");

  /** @type {Category?} */
  let category = $state(null);
  /** @type {User?} */
  let user = $state(null);
  let tick_animation = $state(false);

  const is_past = $derived(!!start_date && start_date < current_time);
  const is_selected = $derived(Selected.tasks.has(task.id));
  const is_ongoing = $derived(isOngoing(due_date, start_date, current_time));

  onMount(async () => {
    category = await getCategory(task);
    user = await getAssignedUser(task);
  });

  /**
   * Handles the selection of a completed task.
   * @param {Event} event
   */
  function handleSelect(event) {
    event.stopPropagation();
    setTimeout(() => onselect(task), COMPLETE_TASK_DELAY_MS);
  }

  /**
   * Determines if a task is ongoing.
   * @param {Date | null} due_date
   * @param {Date | null} start_date
   * @param {Date} today
   */
  function isOngoing(due_date, start_date, today) {
    if (!start_date) return false;
    if (!!due_date) {
      return today >= start_date && today <= due_date;
    } else {
      return DateUtil.isSameDay(today, start_date) && today <= start_date;
    }
  }

  /**
   * Initializes the default category for the task.
   * @param {Task} task
   * @returns {Promise<Category?>}
   */
  async function getCategory(task) {
    if (!task?.category_id) return null;

    const selector = { selector: { id: task.category_id } };
    return DB.Category.getOne(selector).catch(() => null);
  }

  /**
   * Initializes the default category for the task.
   * @param {Task} task
   * @returns {Promise<User?>}
   */
  async function getAssignedUser(task) {
    if (!task?.category_id) return null;
    if (!task?.assigned_user_id) return null;

    const selector = { selector: { id: task.assigned_user_id } };
    return DB.User.getOne(selector).catch(() => null);
  }
</script>

<TaskContainer
  {tick_animation}
  id={task.id}
  class={{
    border: true,
    "bg-success/20 border-success text-alt": is_ongoing && !is_selected,
    "bg-error/20 border-error text-alt": is_past && !is_selected && !is_ongoing,
    "bg-primary/20 border-primary text-alt": is_selected,
    "bg-card border-default": !is_selected && !is_past && !is_ongoing,
  }}
  {onclick}
  {onlongpress}
>
  <ItemName name={task.name} {tick_animation} description={task.description} />

  <div class="flex flex-wrap gap-2 pl-10 font-normal w-full">
    {#if task.start_date}
      <Pill {is_ongoing} {is_past} {is_selected} class="rounded-full">
        <span class="flex gap-1 items-center">
          <Clock class="w-sm h-sm flex-shrink-0" />
          {displayDateTime({
            due_date: DateUtil.parseWithTimeBoundary(task.due_date),
            start_date: DateUtil.parseWithTimeBoundary(task.start_date),
          })}
        </span>

        {#if !!task.repeat_interval}
          <Sync class="w-xs h-xs" />
        {/if}
      </Pill>
    {/if}

    {#if category}
      <Pill {is_ongoing} {is_past} {is_selected} class="rounded">
        <Categories class="w-sm h-sm flex-shrink-0" />
        <span class="truncate">{category.name}</span>
      </Pill>
    {/if}

    {#if user}
      <Pill {is_ongoing} {is_past} {is_selected} class="rounded">
        <Users class="w-sm h-sm flex-shrink-0" />
        <span class="truncate">{user.name}</span>
      </Pill>
    {/if}
  </div>

  <div class="absolute top-1.5 right-1.5 flex gap-1">
    {#if !task.archived}
      <Important class={!task.important && "hidden"} />
      {#if !!task.photo_ids?.length}
        <Camera class="w-sm h-sm flex-shrink-0" />
      {/if}
    {/if}
  </div>

  <InputCheckbox bind:tick_animation {is_selected} {onlongpress} onselect={handleSelect} />
</TaskContainer>
