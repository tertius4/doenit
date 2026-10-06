<script>
  import SelectRepeatInterval from "$display/features/repeat/SelectRepeatInterval.svelte";
  import DropdownCategory from "$display/features/edit-task/DropdownCategory.svelte";
  import SelectGroup from "$display/features/edit-task/SelectGroup.svelte";
  import SelectAssignee from "$display/features/edit-task/SelectAssignee.svelte";
  import InputName from "$display/features/edit-task/InputName.svelte";
  import t from "$display/translate";
  import { slide } from "svelte/transition";
  import toast from "$display/toast/toast.svelte";
  import ButtonSubmitTask from "./ButtonSubmitTask.svelte";
  import Button from "$display/comps/button/Button.svelte";
  import DatePickerShortcut from "./DatePickerShortcut.svelte";
  import { config } from "$lib/config";
  import PhotoGallery from "./PhotoGallery.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import DatePicker from "./DatePicker.svelte";
  import DescriptionEditor from "./DescriptionEditor.svelte";

  /**
   * @typedef {Object} Props
   * @property {Domain.Task} task
   * @property {(task: Domain.Task) => AsyncResult} onsubmit
   */

  /** @type {Props & Record<string, any>} */
  const { task, onsubmit } = $props();

  let is_loading = $state(false);
  let name_invalid = $state(false);
  let is_prompting = $state(false);
  let is_editing_description = $state(false);

  const date_title = $derived(!!task.start_date ? t("date") : t("due_date"));
  const scope_id = $derived(/** @type {any} */ (task).scope_id);

  // The assignee must be a member of the task's group.
  $effect(() => {
    if (!scope_id && task.assigned_firebase_uid) task.assigned_firebase_uid = undefined;
  });

  /**
   * Handle form submission
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    is_loading = true;

    const result = await onsubmit(JSON.parse(JSON.stringify(task)));
    if (!result.ok) {
      if (!result.ok) {
        name_invalid = t("what_must_be_done") === result.error;
        if (!name_invalid) toast.error(result.error);
      }
    }

    is_loading = false;
  }

  /**
   * @param {string} value
   */
  function onchangeName(value) {
    if (name_invalid) name_invalid = false;
    task.name = value;
  }
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  <div>
    <InputName value={task.name} onchange={onchangeName} invalid={name_invalid} focus_on_mount />

    {#if task.description}
      <button
        type="button"
        class="mt-1 w-full flex items-start gap-2 text-start text-sm bg-card border border-default rounded-lg px-3 py-2"
        onclick={() => (is_editing_description = true)}
      >
        <span class="flex-1 min-w-0 line-clamp-2 whitespace-pre-line text-muted">{task.description}</span>
        <Icon name="edit" size={16} class="shrink-0 mt-0.5" />
      </button>
    {:else}
      <button type="button" class="mt-1 px-1 text-sm text-primary" onclick={() => (is_editing_description = true)}>
        + {t("add_description")}
      </button>
    {/if}
  </div>

  {#if is_editing_description}
    <DescriptionEditor bind:value={task.description} onclose={() => (is_editing_description = false)} />
  {/if}

  <div>
    <label class="font-semibold" for="category">{t("category")}</label>
    <DropdownCategory bind:category_id={task.category_id} />
  </div>

  <SelectGroup bind:value={task.scope_id} />

  <SelectAssignee {scope_id} bind:value={task.assigned_firebase_uid} />

  <div class="w-full">
    <label class="font-semibold" for="date">{date_title}</label>
    <DatePicker bind:start={task.start_date} bind:end={task.due_date} />
    <DatePickerShortcut date={task.start_date} onchange={(value) => (task.start_date = value)} />
  </div>

  {#if task.start_date}
    <div transition:slide>
      <label class="font-bold" for="repeat">{t("repeat")}</label>
      <SelectRepeatInterval
        bind:interval={task.repeat_interval}
        bind:days={task.repeat_specific_days}
        bind:number={task.repeat_interval_number}
      />
    </div>
  {/if}

  <div>
    <div class="grid grid-cols-[40px_auto_128px] py-2 border-y border-default">
      <Icon name="important" size={20} class="m-auto" />
      <div class="flex flex-col">
        <span class="font-semibold">{t("is_this_important")}</span>
        <span class="italic">{t("this_will_appear_higher")}</span>
      </div>
      <Button
        class={{
          "bg-card border border-default": !task.important,
          "bg-warning/10! border-warning! text-warning!": task.important,
        }}
        type="button"
        aria-label={t("important")}
        onclick={() => {
          task.important = !task.important;
        }}
      >
        <Icon name="important" size={20} />
        <span>{t("important")}</span>
      </Button>
    </div>
  </div>

  <PhotoGallery bind:photo_ids={task.photo_ids} class="mt-4" bind:is_prompting />

  <div
    class="fixed flex inset-0 justify-between items-center w-full h-fit z-10 top-auto px-2"
    style="bottom: max(16px, env(safe-area-inset-bottom));"
  >
    {#if config.photos_enabled}
      <button
        type="button"
        onclick={() => (is_prompting = true)}
        disabled={is_loading}
        class="flex justify-center bg-card items-center aspect-square rounded-full size-13 p-3 disabled:opacity-50"
      >
        <Icon name="camera" />
      </button>
    {/if}

    <ButtonSubmitTask loading={is_loading} />
  </div>
</form>
