<script>
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import ListForm from "./ListForm.svelte";
  import t from "$display/translate";
  import Modal from "$display/comps/modal/Modal.svelte";
  import { untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {boolean} [completable=false]
   * @prop {string | null} [target_date=null]
   * @prop {(values: { name: string, description: string, completable: boolean, target_date: string | null }) => Promise<{ ok: boolean, error?: string }> | { ok: boolean, error?: string }} [onsubmit]
   * @prop {() => *} [onclose]
   */

  /** @type {Props} */
  let {
    open = $bindable(false),
    name = "",
    description = "",
    completable = false,
    target_date = null,
    onsubmit,
    onclose,
  } = $props();

  let local_name = $state("");
  let local_description = $state("");
  let local_completable = $state(false);
  /** @type {string | null} */
  let local_target_date = $state(null);
  let error_message = $state("");
  let name_invalid = $state(false);
  let is_loading = $state(false);

  // Only (re)initialise when the modal opens; later prop updates (e.g. sync) must not wipe what the user typed.
  $effect(() => {
    if (!open) return;

    untrack(() => {
      local_name = name;
      local_description = description;
      local_completable = completable;
      local_target_date = target_date;
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
      error_message = t("enter_list_name");
      return;
    }

    const unchanged =
      local_name.trim() === name &&
      local_description.trim() === description &&
      local_completable === completable &&
      local_target_date === target_date;
    if (unchanged) {
      open = false;
      return;
    }

    is_loading = true;
    try {
      const result = await onsubmit({
        name: local_name,
        description: local_description,
        completable: local_completable,
        target_date: local_completable ? local_target_date : null,
      });
      if (!result.ok) return (error_message = result.error ?? t("something_went_wrong"));

      open = false;
    } finally {
      is_loading = false;
    }
  }
</script>

<Modal bind:is_open={open} {onclose} onsubmit={handleSave} class="*:space-y-3">
  <ModalHeader>{t("edit_list")}</ModalHeader>

  <ListForm
    bind:name={local_name}
    bind:description={local_description}
    bind:completable={local_completable}
    bind:target_date={local_target_date}
    error={error_message}
    {name_invalid}
    onedit={clearError}
  />

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="save" size={20} />
    <span>{t("save")}</span>
  </button>
</Modal>
