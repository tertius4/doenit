<script>
  import InputTaskName from "$lib/components/element/input/InputTaskName.svelte";
  import ButtonSubmitTask from "./element/button/ButtonSubmitTask.svelte";
  import CategoryPicker from "$lib/components/CategoryPicker.svelte";
  import Herhaling from "$lib/components/task/Herhaling.svelte";
  import DatePickerShortcut from "./DatePickerShortcut.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import PhotoGallery from "./photo/PhotoGallery.svelte";
  import { Photos } from "$lib/services/photos.svelte";
  import Button from "./element/button/Button.svelte";
  import { t } from "$lib/services/language.svelte";
  import DatePicker from "./DatePicker.svelte";
  import { slide } from "svelte/transition";
  import { user } from "$lib/base/user.svelte";
  import { Important } from "$lib/icon";
  import { tick } from "svelte";
  import UserPicker from "./UserPicker.svelte";

  /**
   * @typedef {Object} Props
   * @property {Task} task
   */

  /** @type {Props & Record<string, any>} */
  let { task = $bindable(), error = $bindable(), other_interval = $bindable(), onsubmit, expanded = false } = $props();

  const usersContext = getUsersContext();

  let show = $state(expanded);
  let loading = $state(false);
  let invalid = $state(false);
  let task_user = $state(task.assigned_user_email ? usersContext.getUserByEmail(task.assigned_user_email) : undefined);

  const title = $derived(!!task.start_date ? t("date") : t("due_date"));

  $effect(() => {
    task.assigned_user_email = task_user?.email_address;
  });

  /**
   * Handle form submission
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    if (!task.name?.trim()) {
      await tick();
      invalid = true;
      return;
    }

    loading = true;
    if (onsubmit) await onsubmit(event);
    loading = false;
  }
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  <InputTaskName {onsubmit} {invalid} {show} focus_on_mount bind:value={task.name} />

  <div>
    <label class="font-semibold" for="category">{t("category")}</label>
    <CategoryPicker bind:category_id={task.category_id} />
  </div>

  {#if user.is_friends_enabled && task.category_id}
    <UserPicker bind:user={task_user} category_id={task.category_id} />
  {/if}

  <div class="w-full">
    <label class="font-semibold" for="date">{title}</label>
    <DatePicker bind:start={task.start_date} bind:end={task.due_date} />
    <DatePickerShortcut bind:date={task.start_date} />
  </div>

  {#if task.start_date}
    <div transition:slide>
      <label class="font-bold" for="repeat">{t("repeat")}</label>
      <Herhaling
        bind:repeat_interval_number={task.repeat_interval_number}
        bind:repeat_interval={task.repeat_interval}
        bind:specific_days={task.repeat_specific_days}
        bind:other_interval
      />
    </div>
  {/if}

  <div>
    <div class="grid grid-cols-[40px_auto_128px] py-2 border-y border-default">
      <Important class="m-auto" />
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
        <Important />
        <span>{t("important")}</span>
      </Button>
    </div>
  </div>

  {#if Photos.PHOTOS_ENABLED}
    <div>
      <PhotoGallery bind:photo_ids={task.photo_ids} />
    </div>
  {/if}

  <ButtonSubmitTask {loading} />
</form>
