<script>
  import { navigating } from "$app/state";
  import Icon from "$display/comps/Icon.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {string} task_id - The ID of the original task (undefined if new)
   * @property {Domain.Task} changed - The changed object to compare against the original.
   * @property {boolean} loading - Whether the task is currently being saved.
   * @property {() => *} onclick - The function to call when the back button
   */

  /** @type {Props} */
  const { task_id, changed, loading, onclick } = $props();

  let is_open = $state(false);

  async function handleClick() {
    if (loading || navigating.to) return;

    const has_changes = await Api.task.isTaskUpdated(task_id, changed);
    if (!has_changes) onclick();
    else is_open = true;
  }

  async function handleSave() {
    const result = await Api.task.updateTask(changed);
    onclick();
  }
</script>

<button
  type="button"
  aria-label="Go back button"
  class="flex justify-center text-alt bg-card items-center aspect-square rounded-full size-13 p-3"
  onclick={handleClick}
  disabled={loading || !!navigating.to}
>
  {#if navigating.to}
    <Icon name="loading" class="animate-spin text-lg" />
  {:else}
    <Icon name="xmark" size={28} />
  {/if}
</button>

<Modal bind:is_open>
  <ModalHeader>{t("save_changes")}?</ModalHeader>

  <footer class="flex w-full items-center justify-between mt-4">
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-card border border-default rounded-lg"
      onclick={() => {
        is_open = false;
        onclick();
      }}
    >
      <Icon name="trash" size={20} />
      <span>{t("discard")}</span>
    </button>
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-primary text-alt rounded-lg ml-auto"
      onclick={handleSave}
    >
      <Icon name="save" size={20} />
      <span>{t("save")}</span>
    </button>
  </footer>
</Modal>
