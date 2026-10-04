<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import Icon from "$display/comps/Icon.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import t from "$display/translate";
  import { config } from "$lib/config";

  /**
   * @typedef {Object} Props
   * @prop {(photos: boolean) => *} onconfirm - Called with whether photos should be included.
   * @prop {() => *} onclose - Called when the modal closes (the opener unmounts it).
   */

  /** @type {Props} */
  const { onconfirm, onclose } = $props();

  let include_photos = $state(false);

  function handleSubmit() {
    onconfirm(include_photos);
    onclose();
  }
</script>

<Modal class="p-6" {onclose} onsubmit={handleSubmit}>
  <ModalHeader>{t("backup_question")}</ModalHeader>

  {#if config.photos_enabled}
    <div class="flex items-center my-4 gap-2">
      <InputSwitch value={include_photos} onchange={(value) => (include_photos = value)} />
      <p class="font-medium">{t("backup_include_photos")}</p>
    </div>
  {/if}

  <footer class="flex justify-end mt-4">
    <button
      type="submit"
      aria-label={t("backup_aria")}
      class="text-md items-center justify-center text-alt px-4 py-2 flex gap-1 bg-primary rounded-lg"
    >
      <Icon name="check" />
      <span>{t("backup")}</span>
    </button>
  </footer>
</Modal>
