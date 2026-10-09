<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @prop {() => *} onconfirm - Called when the user confirms the delete.
   * @prop {() => *} onclose - Called when the modal closes (the opener unmounts it).
   */

  /** @type {Props} */
  const { onconfirm, onclose } = $props();

  function handleSubmit() {
    onconfirm();
    onclose();
  }
</script>

<Modal class="space-y-4" {onclose} onsubmit={handleSubmit}>
  <ModalHeader>{t("delete_account")}?</ModalHeader>
  <p class="pt-2 text-muted">{t("delete_account_question")}</p>

  <button
    type="submit"
    class="ml-auto mt-4 h-12 p-2 bg-error text-white rounded-lg font-semibold flex items-center justify-center gap-2 px-3"
  >
    {t("delete_account")}
  </button>
</Modal>
