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
  <ModalHeader>{t("delete")}?</ModalHeader>
  <p class="pt-2 text-muted break-all">{t("api_key_delete_question", { label })}</p>

  <button
    type="submit"
    class="ml-auto mt-4 h-12 p-2 bg-error rounded-lg font-semibold flex items-center justify-center gap-2 px-3"
  >
    {t("delete")}
  </button>
</Modal>
