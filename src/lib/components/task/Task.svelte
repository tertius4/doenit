<script>
  import { Camera, Categories, Clock, Important, Sync, Users } from "$lib/icon";
  import InputCheckbox from "../element/input/InputCheckbox.svelte";
  import { COMPLETE_TASK_DELAY_MS, displayDateTime } from "$lib";
  import TaskContainer from "./TaskContainer.svelte";
  import { Selected } from "$lib/selected";
  import ItemName from "./ItemName.svelte";
  import { DateUtil } from "$lib/core/date_util";
  import Pill from "./Pill.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";

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

  const usersContext = getUsersContext();
  const categoriesContext = getCategoriesContext();

  const due_date = DateUtil.parseWithTimeBoundary(task.due_date, "end");
  const start_date = DateUtil.parseWithTimeBoundary(task.start_date, !!due_date ? "start" : "end");

  let tick_animation = $state(false);

  const is_past = $derived(!!start_date && start_date < current_time);
  const is_selected = $derived(Selected.tasks.has(task.id));
  const is_ongoing = $derived(isOngoing(due_date, start_date, current_time));
  /** @type {Category | undefined} */
  const category = $derived(task.category_id ? categoriesContext.getCategoryById(task.category_id) : undefined);
  /** @type {User | undefined} */
  const user = $derived(task.assigned_user_email ? usersContext.getUserByEmail(task.assigned_user_email) : undefined);

  /**
   * Handles the selection of a completed task.
   * @param {Event} event
   */
  function handleSelect(event) {
    event.stopPropagation();
    if (Selected.tasks.has(task.id)) {
      Selected.tasks.delete(task.id);
      tick_animation = false;
      return;
    }

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
  <ItemName name={task.name} {tick_animation} description={""} />

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
      <Pill {is_ongoing} {is_past} {is_selected} class="rounded-full">
        <img
          class="w-sm h-sm rounded-full flex-shrink-0"
          src={user.avatar}
          alt={user.name}
          referrerpolicy="no-referrer"
        />
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
