<script>
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import ListForm from "$display/features/lists/ListForm.svelte";
  import t from "$display/translate";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";

  /**
   * Creates a new private list. Editing and sharing a list happens in EditList / ModalEditListInfo.
   *
   * @typedef {Object} Props
   * @prop {boolean} [open=false] - Whether the modal is open.
   * @prop {(id: string) => *} [onsubmit] - Callback when a list is created.
   * @prop {() => *} [onclose] - Callback when the modal is closed.
   */

  /** @type {Props} */
  let { open = $bindable(false), onsubmit, onclose } = $props();

  let name = $state("");
  let description = $state("");
  let error_message = $state("");
  let name_invalid = $state(false);
  let is_loading = $state(false);

  function reset() {
    name = "";
    description = "";
    error_message = "";
    name_invalid = false;
  }

  function clearError() {
    error_message = "";
    name_invalid = false;
  }

  async function saveList() {
    if (is_loading) return;

    clearError();

    if (!name.trim()) {
      name_invalid = true;
      error_message = t("enter_list_name");
      return;
    }

    is_loading = true;

    try {
      const result = await Api.lists.save({ name, description });
      if (!result.ok) return (error_message = result.error);

      reset();
      open = false;
      if (onsubmit) await onsubmit(result.value.id);
    } finally {
      is_loading = false;
    }
  }

  function handleClose() {
    reset();
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveList} class="*:space-y-4">
  <ModalHeader>{t("new_list")}</ModalHeader>

  <ListForm bind:name bind:description error={error_message} {name_invalid} onedit={clearError} />

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="plus" size={20} />
    <span>{t("create")}</span>
  </button>
</Modal>
