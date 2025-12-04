<script>
  import InputCheckbox from "$lib/components/element/input/InputCheckbox.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte.js";
  import SaveChanges from "$lib/components/SaveChanges.svelte";
  import { Photos } from "$lib/services/photos.svelte.js";
  import Modal from "$lib/components/modal/Modal.svelte";
  import EditTask from "$lib/components/EditTask.svelte";
  import { t } from "$lib/services/language.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { Alert } from "$lib/core/alert.js";
  import { goto } from "$app/navigation";
  import { setContext } from "svelte";
  import { Trash } from "$lib/icon";
  import { DB } from "$lib/DB.js";

  const { data } = $props();

  const categories_context = getCategoriesContext();

  let task = $state(data.task);
  let is_deleting = $state(false);
  let is_saving = $state(false);
  let error = $state({});
  let other_interval = $state(data.task.repeat_interval_number > 1 ? data.task.repeat_interval : "");

  /** @type {SvelteSet<string>} */
  const deleted_photo_ids = new SvelteSet();
  setContext("deleted_photo_ids", deleted_photo_ids);

  $effect(() => {
    if (!!task.start_date) return;

    task.repeat_interval = "";
    task.repeat_interval_number = 1;
    task.due_date = null;
  });

  $effect(() => {
    if (task.repeat_interval !== "weekly_custom_days") return;

    task.due_date = task.start_date;
  });

  /**
   * @param {Event} event
   */
  async function onsubmit(event) {
    event.preventDefault();
    await updateTask(task);
  }

  /**
   * @param {Task} task
   * @returns {Promise<Result<string>>}
   */
  async function updateTask(task) {
    is_saving = true;

    try {
      if (task.repeat_interval_number > 1) {
        task.repeat_interval = other_interval;
      }

      // Validate category and assigned user
      if (task.category_id) {
        const category = categories_context.getCategoryById(task.category_id);
        if (!category) {
          task.category_id = undefined;
          task.assigned_user_email = undefined;
        } else {
          const selected_user = category.users.find((u) => u === task.assigned_user_email);
          if (!selected_user) {
            task.assigned_user_email = undefined;
          }
        }
      }

      const updated_task = await DB.Task.update(task.id, task);
      if (!updated_task) {
        throw new Error(t("error_updating_task"));
      }

      // Delete removed photos
      const ids = [...deleted_photo_ids.values()];
      const promised = ids.map((p) => Photos.deletePhoto(p));
      await Promise.all(promised);

      await goto("/");
      is_saving = false;
      return { success: true, data: task.id };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(error_message);
      is_saving = false;
      return { success: false, error_message };
    }
  }

  async function deleteTask() {
    await DB.Task.delete(task.id);
    await goto("/");
  }

  /**
   * @param {Event} event
   */
  async function handleSelectTask(event) {
    try {
      event.stopPropagation();
      if (task.archived) {
        task.completed = 0;
        task.archived = false;
      } else {
        task.completed++;
        task.archived = true;
      }

      await DB.Task.update(task.id, task);
    } catch (error) {
      Alert.error(`${t("error_updating_task")}: ${error}`);
    }
  }
</script>

<button
  type="button"
  class="fixed top-5 right-5 flex justify-center items-center"
  onclick={() => {
    is_deleting = true;
  }}
  aria-label={t("close")}
>
  <Trash class="text-2xl text-error" />
</button>

<SaveChanges original={data.task} changed={task} onsave={updateTask} />

<div class="mb-20">
  <EditTask bind:error bind:task bind:other_interval {onsubmit} expanded />

  <div class="h-12 flex">
    <div class="font-bold text-left my-auto w-full">{t("complete")}</div>

    <InputCheckbox
      class="static! top-0! translate-0! left-0! bottom-0! right-0! p-2! z-1"
      onselect={handleSelectTask}
      is_selected={!!task.archived}
      tick_animation={!!task.archived}
    />
  </div>
</div>

<Modal bind:is_open={is_deleting} onclose={() => (is_deleting = false)} class="space-y-4">
  <h2 class="font-bold text-lg">{t("delete_task")}</h2>
  <p>{t("delete_task_confirmation")}</p>
  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md" onclick={deleteTask}>
    <Trash class="h-full" size={18} />
    <span>{t("delete")}</span>
  </button>
</Modal>
