<script>
  import InputText from "../input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
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
  let is_loading = $state(false);

  async function saveGroup() {
    if (is_loading) return;

    error_message = "";
    is_loading = true;

    try {
      const result = await Api.groups.save({ name, description });
      if (!result.ok) return (error_message = result.error);

      if (onsubmit) await onsubmit(result.value.id);

      name = "";
      description = "";
      open = false;
    } finally {
      is_loading = false;
    }
  }

  function handleClose() {
    error_message = "";
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveGroup} class="*:space-y-4">
  <ModalHeader>{t("new_group")}</ModalHeader>

  <InputText
    value={name}
    onchange={(value) => (name = value)}
    focus_on_mount
    maxlength="100"
    placeholder={t("enter_group_name")}
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />

  <textarea
    bind:value={description}
    maxlength="250"
    placeholder={t("enter_group_description")}
    rows="3"
    class="bg-card border border-default p-2 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary resize-none"
  ></textarea>

  {#if error_message}
    <p class="text-sm text-error">{error_message}</p>
  {/if}

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="plus" size={20} />
    <span>{t("create")}</span>
  </button>
</Modal>
