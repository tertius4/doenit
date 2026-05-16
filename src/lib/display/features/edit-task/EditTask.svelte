<script>
  import SelectRepeatInterval from "$display/features/repeat/SelectRepeatInterval.svelte";
  import DropdownCategory from "$display/features/edit-task/DropdownCategory.svelte";
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
  import ButtonBack from "../header/ButtonBack.svelte";
  import { goto } from "$app/navigation";

  /**
   * @typedef {Object} Props
   * @property {Domain.Task} task
   * @property {(task: Domain.Task) => AsyncResult} onsubmit
   */

  /** @type {Props & Record<string, any>} */
  const { task, onsubmit } = $props();

  let is_loading = $state(false);
  let name_invalid = $state(false);

  const date_title = $derived(!!task.start_date ? t("date") : t("due_date"));
  const scope_id = $derived(/** @type {any} */ (task).scope_id);

  /**
   * Handle form submission
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    is_loading = true;

    const result = await onsubmit(JSON.parse(JSON.stringify(task)));
    if (!result.ok) {
      toast.show({ body: result.error, type: "error", duration: 3000 });
      name_invalid = t("what_must_be_done") === result.error;
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
  <InputName value={task.name} onchange={onchangeName} invalid={name_invalid} focus_on_mount />

  <div>
    <label class="font-semibold" for="category">{t("category")}</label>
    <DropdownCategory bind:category_id={task.category_id} />
  </div>

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

  <div
    class="absolute flex inset-0 justify-between items-center w-full h-fit z-10 bottom-0 top-auto px-2 pb-2"
  >
    <ButtonBack loading={is_loading} onclick={() => goto("/", { replaceState: true })} />

    {#if config.photos_enabled}
      <div>
        <PhotoGallery bind:photo_ids={task.photo_ids} />
      </div>
    {/if}

    <ButtonSubmitTask loading={is_loading} />
  </div>
</form>
