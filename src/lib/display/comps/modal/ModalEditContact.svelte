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

  // svelte-ignore state_referenced_locally
  let name = $state(initial_name ?? "");
  let error_message = $state("");
  let is_loading = $state(false);
  let is_confirming_delete = $state(false);

  $effect(() => {
    if (open) {
      name = initial_name ?? "";
      error_message = "";
      is_confirming_delete = false;
    }
  });

  async function handleSave() {
    if (is_loading) return;

    error_message = "";
    is_loading = true;
    const result = await Api.contacts.update(contact_id, { name: name.trim() || null }).finally(
      () => (is_loading = false),
    );

    if (!result.ok) {
      error_message = result.error;
      return;
    }

    open = false;
  }

  async function handleDelete() {
    if (is_loading) return;

    is_loading = true;
    const result = await Api.contacts.delete(contact_id).finally(() => (is_loading = false));
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

  <button
    class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
    type="submit"
    disabled={is_loading}
  >
    <Icon name="save" size={20} />
    <span>{t("save")}</span>
  </button>

  <hr class="border-default" />

  {#if is_confirming_delete}
    <p class="text-sm">{t("confirm_delete_contact")}</p>
    <div class="flex gap-2 justify-between">
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-card" onclick={() => (is_confirming_delete = false)}>
        {t("cancel")}
      </button>
      <button
        type="button"
        class="text-sm px-4 py-2 rounded-md bg-error text-alt disabled:opacity-50"
        disabled={is_loading}
        onclick={handleDelete}
      >
        {t("delete")}
      </button>
    </div>
  {:else}
    <button type="button" class="flex gap-1 items-center text-sm text-error" onclick={() => (is_confirming_delete = true)}>
      <Icon name="trash" size={18} />
      <span>{t("delete")}</span>
    </button>
  {/if}
</Modal>
