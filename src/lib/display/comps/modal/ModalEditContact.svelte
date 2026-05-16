<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import t from "$display/translate";
  import Icon from "../Icon.svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} contact_id
   * @prop {string | null} [initial_name=null]
   */

  /** @type {Props} */
  let { open = $bindable(false), contact_id, initial_name = null } = $props();

  let name = $state(initial_name ?? "");
  let error_message = $state("");
  let is_loading = $state(false);

  const is_creating = $derived(!contact_id);

  $effect(() => {
    if (open) {
      name = initial_name ?? "";
      error_message = "";
    }
  });

  async function handleSave() {
    error_message = "";
    is_loading = true;
    const result = await Api.contacts.update(contact_id, { name: name.trim() || null });
    is_loading = false;

    if (!result.ok) {
      error_message = result.error;
      return;
    }

    open = false;
  }

  function handleClose() {
    error_message = "";
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={handleSave} class="*:space-y-4">
  <ModalHeader>{t("edit_contact")}</ModalHeader>

  <InputText
    value={name}
    onchange={(value) => (name = value)}
    focus_on_mount
    maxlength="100"
    placeholder={t("contact_name")}
    onfocus={() => (error_message = "")}
  />

  {#if error_message}
    <p class="text-sm text-error">{error_message}</p>
  {/if}

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto" type="submit">
    <Icon name={is_creating ? "plus" : "save"} size={20} />
    <span>{is_creating ? t("create") : t("save")}</span>
  </button>
</Modal>
