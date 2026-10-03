<script>
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import GroupForm from "./GroupForm.svelte";
  import t from "$display/translate";
  import Modal from "$display/comps/modal/Modal.svelte";
  import { untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {(name: string, description: string) => Promise<{ ok: boolean, error?: string }> | { ok: boolean, error?: string }} [onsubmit]
   * @prop {() => *} [onclose]
   */

  /** @type {Props} */
  let { open = $bindable(false), name = "", description = "", onsubmit, onclose } = $props();

  let local_name = $state("");
  let local_description = $state("");
  let error_message = $state("");
  let name_invalid = $state(false);
  let is_loading = $state(false);

  // Only (re)initialise when the modal opens; later prop updates (e.g. sync) must not wipe what the user typed.
  $effect(() => {
    if (!open) return;

    untrack(() => {
      local_name = name;
      local_description = description;
      clearError();
    });
  });

  function clearError() {
    error_message = "";
    name_invalid = false;
  }

  async function handleSave() {
    if (!onsubmit || is_loading) return;

    clearError();

    if (!local_name.trim()) {
      name_invalid = true;
      error_message = t("group_name_required");
      return;
    }

    const unchanged = local_name.trim() === name && local_description.trim() === description;
    if (unchanged) {
      open = false;
      return;
    }

    is_loading = true;
    try {
      const result = await onsubmit(local_name, local_description);
      if (!result.ok) return (error_message = result.error ?? t("something_went_wrong"));

      open = false;
    } finally {
      is_loading = false;
    }
  }
</script>

<Modal bind:is_open={open} {onclose} onsubmit={handleSave} class="*:space-y-3">
  <ModalHeader>{t("edit_group")}</ModalHeader>

  <GroupForm bind:name={local_name} bind:description={local_description} error={error_message} {name_invalid} onedit={clearError} />

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="save" size={20} />
    <span>{t("save")}</span>
  </button>
</Modal>
