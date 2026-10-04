<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @prop {string} filename - Name of the chosen backup file.
   * @prop {() => *} onconfirm - Called when the user confirms the restore.
   * @prop {() => *} onclose - Called when the modal closes (the opener unmounts it).
   */

  /** @type {Props} */
  const { filename, onconfirm, onclose } = $props();

  function handleSubmit() {
    onconfirm();
    onclose();
  }
</script>

<Modal class="space-y-4" {onclose} onsubmit={handleSubmit}>
  <ModalHeader>{t("restore_data")}</ModalHeader>
  <p class="text-muted break-all">{filename}</p>

  <p class="font-medium">{t("restore_merge_info")}</p>

  <button
    type="submit"
    class="w-full mt-4 h-12 p-2 bg-primary text-alt rounded-lg font-semibold flex items-center justify-center gap-2"
  >
    <Icon name="restore" class="text-xl" />
    {t("confirm_restore")}
  </button>
</Modal>
