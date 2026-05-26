<script>
  import Icon from "$display/comps/Icon.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import t from "$display/translate";
  import Modal from "$display/comps/modal/Modal.svelte";
  import Api from "$logic/api";
  import toast from "$display/toast/toast.svelte";

  /**
   * @typedef {Object} Props
   * @prop {string} group_id
   * @prop {() => *} [ondisband]
   */

  /** @type {Props} */
  let { group_id, ondisband } = $props();

  let open = $state(false);

  async function confirmDisband() {
    const result = await Api.groups.delete(group_id);
    if (!result.ok) return toast.error(result.error);
    open = false;
    if (ondisband) await ondisband();
  }
</script>

<button type="button" class="flex gap-1 items-center text-sm text-error" onclick={() => (open = true)}>
  <Icon name="trash" size={18} />
  <span>{t("disband_group")}</span>
</button>

<Modal bind:is_open={open} close_on_outside_click={false}>
  <ModalHeader>{t("disband_group")}</ModalHeader>
  <p class="text-sm mt-4 mb-6">{t("confirm_disband_group")}</p>
  <footer class="flex gap-2 justify-between">
    <button type="button" class="text-sm px-4 py-2 rounded-md bg-card" onclick={() => (open = false)}>
      {t("cancel")}
    </button>
    <button type="button" class="text-sm px-4 py-2 rounded-md bg-error text-alt" onclick={confirmDisband}>
      {t("disband_group")}
    </button>
  </footer>
</Modal>
