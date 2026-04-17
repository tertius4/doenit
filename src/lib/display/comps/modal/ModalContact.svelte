<script>
  import InputText from "../input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false] - Whether the modal is open.
   * @prop {string} [id] - The ID of the contact to edit (undefined if creating a new contact).
   * @prop {string} [name] - The name of the contact.
   * @prop {string} [email_address] - The email address of the contact.
   * @prop {string} [avatar] - The avatar URL of the contact.
   * @prop {(id: string) => *} [onsubmit] - Callback when a contact is created/saved.
   * @prop {() => *} [onclose] - Callback when the modal is closed.
   */

  /** @type {Props & Record<string, any>} */
  let { open = $bindable(false), id, name = "", email_address = "", avatar, ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { onsubmit, onclose, ...rest } = props;

  let error_message = $state("");

  const is_creating = $derived(!id);

  async function saveContact() {
    error_message = "";

    const result = await Api.contacts.save({ id, name, email_address, avatar });
    if (!result.ok) return (error_message = result.error);

    open = false;

    if (onsubmit) onsubmit(result.value.id);

    if (is_creating) {
      name = "";
      email_address = "";
    }
  }

  function handleClose() {
    error_message = "";
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveContact} class="*:space-y-4" {...rest}>
  <ModalHeader>{is_creating ? t("create_new_contact") : t("edit_contact")}</ModalHeader>

  <InputText
    value={name}
    onchange={(value) => (name = value)}
    focus_on_mount
    maxlength="100"
    placeholder={t("enter_contact_name")}
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />

  <InputText
    value={email_address}
    onchange={(value) => (email_address = value)}
    maxlength="200"
    placeholder={t("enter_contact_email")}
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
