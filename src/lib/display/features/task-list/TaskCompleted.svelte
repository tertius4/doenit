<script>
  import TaskContainer from "$display/features/task-list/TaskContainer.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import Icon from "$display/comps/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @prop {Logic.DonePageTask} task - The task to display.
   * @prop {boolean} is_selected - Whether the task is currently selected.
   * @prop {(checked: boolean) => void} [oncheck] - Callback function to call when the checkbox is toggled.
   * @prop {() => void} [onclick] - Callback function to call when the task is clicked.
   * @prop {() => void} [onlongpress] - Callback function to call when the task is long-pressed.
   */

  /** @type {Props} */
  const { task, is_selected, onlongpress, onclick, oncheck } = $props();

  let checked = $state(true);

  const { id, name, pills, completed_count } = $derived(task);

  /**
   * @param {boolean} value
   */
  function handleClick(value) {
    checked = value;
    if (oncheck) oncheck(value);
  }
</script>

<TaskContainer
  {onlongpress}
  {onclick}
  {id}
  class={{
    "border grid grid-cols-[auto_1fr] gap-2": true,
    "bg-primary/20 border-primary text-alt/80": is_selected,
    "bg-card border-default text-muted": !is_selected,
  }}
>
  <InputCheckbox {checked} onchange={handleClick} class="my-auto" />
  <div>
    <div class="font-medium text-start">{name}</div>
    <div class="flex gap-1">
      {#each pills as pill}
        <span
          class={{
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5": true,
            "rounded-full": pill.type === "round",
            rounded: pill.type === "square",
            "bg-primary text-alt": is_selected,
            "bg-surface border-default": !is_selected,
          }}
        >
          {#if pill.pre_icon}
            <Icon name={pill.pre_icon} class="text-current" size={16} />
          {/if}
          {pill.label}
          {#if pill.post_icon}
            <Icon name={pill.post_icon} class="text-current" size={16} />
          {/if}
        </span>
      {/each}
    </div>

    {#if completed_count > 1}
      <div class="absolute top-1 right-2 flex gap-1 opacity-50 font-semibold">
        <Icon name="sync" class="w-sm h-sm my-auto" />
        <span>×</span>
        <span>{completed_count}</span>
      </div>
    {/if}
  </div>
</TaskContainer>
