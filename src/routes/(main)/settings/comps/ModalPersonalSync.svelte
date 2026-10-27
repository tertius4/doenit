<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @prop {() => *} onconfirm - Called when the user accepts that their personal tasks go to the cloud.
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
  <ModalHeader>{t("sync_modal_title")}</ModalHeader>
  <ul class="pt-2 text-muted list-disc pl-5 space-y-2">
    <li>{t("sync_modal_what")}</li>
    <li>{t("sync_modal_where")}</li>
    <li>{t("sync_modal_devices")}</li>
    <li>{t("sync_modal_offline")}</li>
    <li>{t("sync_modal_off")}</li>
  </ul>

  <button
    type="submit"
    class="ml-auto mt-4 h-12 p-2 bg-primary text-alt rounded-lg font-semibold flex items-center justify-center gap-2 px-3"
  >
    {t("i_understand")}
  </button>
</Modal>
