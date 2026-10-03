<script>
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import GroupForm from "$display/features/groups/GroupForm.svelte";
  import t from "$display/translate";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";

  /**
   * Creates a new group. Editing an existing group happens in EditGroup / ModalEditGroupInfo.
   *
   * @typedef {Object} Props
   * @prop {boolean} [open=false] - Whether the modal is open.
   * @prop {(id: string) => *} [onsubmit] - Callback when a group is created.
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

  async function saveGroup() {
    if (is_loading) return;

    clearError();

    if (!name.trim()) {
      name_invalid = true;
      error_message = t("group_name_required");
      return;
    }

    is_loading = true;

    try {
      const result = await Api.groups.save({ name, description });
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

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveGroup} class="*:space-y-4">
  <ModalHeader>{t("new_group")}</ModalHeader>

  <GroupForm bind:name bind:description error={error_message} {name_invalid} onedit={clearError} />

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="plus" size={20} />
    <span>{t("create")}</span>
  </button>
</Modal>
