<script>
  import SelectRepeatInterval from "$display/features/repeat/SelectRepeatInterval.svelte";
  import DropdownCategory from "$display/features/edit-task/DropdownCategory.svelte";
  import InputTaskName from "$lib/components/element/input/InputTaskName.svelte";
  import ButtonSubmitTask from "./element/button/ButtonSubmitTask.svelte";
  import DatePickerShortcut from "./DatePickerShortcut.svelte";
  import PhotoGallery from "./photo/PhotoGallery.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Photos } from "$lib/services/photos.svelte";
  import Button from "./element/button/Button.svelte";
  import t from "$display/translate";
  import DatePicker from "./DatePicker.svelte";
  import { slide } from "svelte/transition";
  import { alert } from "$lib/core/alert";

  /**
   * @typedef {Object} Props
   * @property {Domain.Task} task
   * @property {(task: Domain.Task) => AsyncResult} onsubmit
   */

  /** @type {Props & Record<string, any>} */
  const { task, onsubmit } = $props();

  let is_loading = $state(false);
  let invalid = $state(false);

  const title = $derived(!!task.start_date ? t("date") : t("due_date"));


  /**
   * Handle form submission
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    is_loading = true;

    const result = await onsubmit(task);
    if (!result.ok) alert.error(result.error);

    is_loading = false;
  }
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  <InputTaskName {onsubmit} {invalid} focus_on_mount bind:value={task.name} />

  <div>
    <label class="font-semibold" for="category">{t("category")}</label>
    <DropdownCategory bind:category_id={task.category_id} />
  </div>

  <div class="w-full">
    <label class="font-semibold" for="date">{title}</label>
    <DatePicker bind:start={task.start_date} bind:end={task.due_date} />
    <DatePickerShortcut bind:date={task.start_date} />
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
      <Icon name="important" class="m-auto" />
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
        <Icon name="important" />
        <span>{t("important")}</span>
      </Button>
    </div>
  </div>

  {#if Photos.PHOTOS_ENABLED}
    <div>
      <PhotoGallery bind:photo_ids={task.photo_ids} />
    </div>
  {/if}

  <ButtonSubmitTask loading={is_loading} />
</form>
