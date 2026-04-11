<script>
  import Icon from "$display/comps/Icon.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import TaskContainer from "./TaskContainer.svelte";

  /**
   * @typedef {Object} Props
   * @prop {Logic.MainPageTask} task - The task to display.
   * @prop {boolean} is_selected - Whether the task is currently selected.
   * @prop {(checked: boolean) => void} [oncheck] - Callback function to call when the checkbox is toggled.
   * @prop {() => void} [onclick] - Callback function to call when the task is clicked.
   * @prop {() => void} [onlongpress] - Callback function to call when the task is long-pressed.
   */

  /** @type {Props} */
  const { task, is_selected, onlongpress, onclick, oncheck } = $props();

  let checked = $state(false);

  const { id, name, pills, is_ongoing, is_past, top_right_icons } = $derived(task);

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
    "bg-success/20 border-success text-alt": is_ongoing && !is_selected,
    "bg-error/20 border-error text-alt": is_past && !is_selected,
    "bg-primary/20 border-primary text-alt": is_selected,
    "bg-card border-default": !is_selected && !is_past && !is_ongoing,
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
            "bg-success text-alt": is_ongoing && !is_selected,
            "bg-error text-alt": is_past && !is_selected,
            "bg-primary text-alt": is_selected,
            "bg-card border-default": !is_selected && !is_past && !is_ongoing,
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
  </div>

  {#if top_right_icons?.length}
    <div class="flex gap-1 absolute top-0 right-0 p-1">
      {#each top_right_icons as icon (icon.name)}
        <Icon name={icon.name} size={16} />
      {/each}
    </div>
  {/if}
</TaskContainer>
