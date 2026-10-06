<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @prop {string} label - Name of the key that will be deleted.
   * @prop {() => *} onconfirm - Called when the user confirms the delete.
   * @prop {() => *} onclose - Called when the modal closes (the opener unmounts it).
   */

  /** @type {Props} */
  const { label, onconfirm, onclose } = $props();

  function handleSubmit() {
    onconfirm();
    onclose();
  }
</script>

<Modal class="space-y-4" {onclose} onsubmit={handleSubmit}>
  <ModalHeader>{t("api_key_delete_question")}</ModalHeader>
  <p class="text-muted break-all">{label}</p>

  <button
    type="submit"
    class="w-full mt-4 h-12 p-2 bg-primary text-alt rounded-lg font-semibold flex items-center justify-center gap-2"
  >
    {t("delete")}
  </button>
</Modal>
