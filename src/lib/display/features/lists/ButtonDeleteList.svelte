<script>
  import Icon from "$display/comps/Icon.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import t from "$display/translate";
  import Modal from "$display/comps/modal/Modal.svelte";
  import Api from "$logic/api";
  import toast from "$display/toast/toast.svelte";

  /**
   * Deletes a list after asking what happens to its tasks: deleted with it, or moved to the Inbox.
   *
   * @typedef {Object} Props
   * @prop {string} list_id
   * @prop {number} [task_count=0] - Open tasks in the list. Without any, there is nothing to ask.
   * @prop {boolean} [is_shared=false]
   * @prop {() => *} [ondelete]
   */

  /** @type {Props} */
  let { list_id, task_count = 0, is_shared = false, ondelete } = $props();

  let open = $state(false);
  let is_loading = $state(false);

  /** @param {boolean} keep_tasks */
  async function confirmDelete(keep_tasks) {
    if (is_loading) return;
    is_loading = true;

    try {
      const result = await Api.lists.delete(list_id, keep_tasks);
      if (!result.ok) return toast.error(result.error);
      open = false;
      if (ondelete) await ondelete();
    } finally {
      is_loading = false;
    }
  }
</script>

<button type="button" class="flex gap-1 items-center text-sm text-error" onclick={() => (open = true)}>
  <Icon name="trash" size={18} />
  <span>{t("delete_list")}</span>
</button>

<Modal bind:is_open={open} close_on_outside_click={false}>
  <ModalHeader>{t("delete_list")}</ModalHeader>
  <p class="text-sm mt-4 mb-6">
    {task_count ? t("confirm_delete_list_with_tasks", { count: task_count }) : t("confirm_delete_list")}
    {#if is_shared}
      {t("delete_list_shared_warning")}
    {/if}
  </p>

  <footer class="flex flex-col gap-2">
    {#if task_count}
      <button
        type="button"
        disabled={is_loading}
        class="text-sm px-4 py-2 rounded-md bg-card border border-default disabled:opacity-50"
        onclick={() => confirmDelete(true)}
      >
        {t("delete_list_keep_tasks")}
      </button>
      <button
        type="button"
        disabled={is_loading}
        class="text-sm px-4 py-2 rounded-md bg-error text-alt disabled:opacity-50"
        onclick={() => confirmDelete(false)}
      >
        {t("delete_list_and_tasks")}
      </button>
    {:else}
      <button
        type="button"
        disabled={is_loading}
        class="text-sm px-4 py-2 rounded-md bg-error text-alt disabled:opacity-50"
        onclick={() => confirmDelete(false)}
      >
        {t("delete_list")}
      </button>
    {/if}
    <button type="button" class="text-sm px-4 py-2 rounded-md" onclick={() => (open = false)}>
      {t("cancel")}
    </button>
  </footer>
</Modal>
