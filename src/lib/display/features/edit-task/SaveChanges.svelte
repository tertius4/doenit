<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import { tempMediaManager } from "$logic/temp-media";
  import toast from "$display/toast/toast.svelte";
  import { backHandler } from "$logic/navigation";
  import Icon from "$display/comps/Icon.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import { onMount } from "svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {((task: DB.Task | Domain.Task) => AsyncResult)} onsave
   * @property {() => Result | AsyncResult} [oncancel]
   * @property {string} [task_id] - The ID of the original task (undefined if new)
   * @property {DB.Task | Domain.Task} changed - The changed object to compare against the original.
   */

  /** @type {Props} */
  const { task_id, changed, onsave, oncancel = () => ({ ok: true }) } = $props();

  let is_open = $state(false);

  onMount(() => {
    const token = backHandler.register(async () => {
      const has_changes = await Api.task.isTaskUpdated(task_id, changed);
      await tempMediaManager.discardAll();

      if (!has_changes) {
        await oncancel();
        return goto("/");
      }

      is_open = true;
    }, -1);

    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  async function handleSave() {
    const result = await onsave(changed);
    if (!result.ok) return toast.error(result.error);

    is_open = false;
  }

  async function handleDiscard() {
    const result = await oncancel();
    if (!result.ok) return toast.error(result.error);

    is_open = false;
  }
</script>

<Modal bind:is_open>
  <ModalHeader>{t("save_changes")}</ModalHeader>

  <footer class="flex w-full items-center justify-between mt-4">
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-card border border-default text-alt rounded-lg"
      onclick={handleDiscard}
    >
      <Icon name="trash" />
      <span>{t("discard")}</span>
    </button>
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-primary text-alt rounded-lg ml-auto"
      onclick={handleSave}
    >
      <Icon name="save" />
      <span>{t("save")}</span>
    </button>
  </footer>
</Modal>
