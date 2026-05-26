<script>
  import Icon from "$display/comps/Icon.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import TaskContainer from "./TaskContainer.svelte";

  /**
   * @typedef {Object} Props
   * @prop {AL.MainPageTask} task - The task to display.
   * @prop {boolean} is_selected - Whether the task is currently selected.
   * @prop {(checked: boolean) => void} [oncheck] - Callback function to call when the checkbox is toggled.
   * @prop {() => void} [onclick] - Callback function to call when the task is clicked.
   * @prop {() => void} [onlongpress] - Callback function to call when the task is long-pressed.
   */

  /** @type {Props & Record<string, any>} */
  const { task, is_selected, onlongpress, onclick, oncheck, ...rest } = $props();

  let checked = $state(false);

  const { id, name, pills, is_ongoing, is_past, top_right_icons, is_for_someone_else } = $derived(task);

  /**
   * @param {boolean} value
   */
  function handleClick(value) {
    checked = value;
    if (oncheck) oncheck(value);

    setTimeout(() => {
      checked = false;
    }, 200);
  }
</script>

<TaskContainer
  {onlongpress}
  {onclick}
  id="task-{task.id}"
  class={[
    {
      "shadow-sm grid grid-cols-[auto_1fr] gap-2": true,
      "bg-success/20 border-success text-alt": is_ongoing && !is_selected && !is_for_someone_else,
      "bg-error/20 border-error text-alt": is_past && !is_selected && !is_for_someone_else,
      "bg-secondary-800 border-primary": is_selected,
      "bg-primary-800": (!is_selected && !is_past && !is_ongoing) || is_for_someone_else,
      "text-muted": is_for_someone_else,
    },
    rest.class || "",
  ]}
>
  <InputCheckbox {checked} onchange={handleClick} class="my-auto" />
  <div class="my-auto">
    <div class="text-start my-auto leading-none" class:font-medium={!is_for_someone_else}>{name}</div>
    <div class="flex gap-1 mt-1" hidden={!pills?.length}>
      {#each pills as pill}
        <span
          class={{
            "inline-flex items-center gap-0.5 text-xs font-medium px-1 py-0.5": true,
            "rounded-full": pill.type === "round",
            rounded: pill.type === "square",
            "bg-success text-alt": is_ongoing && !is_selected && !is_for_someone_else,
            "bg-error text-alt": is_past && !is_selected && !is_for_someone_else,
            "bg-secondary-600 border-primary": is_selected,
            "bg-primary-700": (!is_selected && !is_past && !is_ongoing) || is_for_someone_else,
          }}
        >
          {#if pill.pre_icon}
            <Icon name={pill.pre_icon} class="text-current h-fit" size={12} />
          {/if}
          {pill.label}
          {#if pill.post_icon}
            <Icon name={pill.post_icon} class="text-current h-fit" size={12} />
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
