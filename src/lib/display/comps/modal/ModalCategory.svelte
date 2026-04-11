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
   * @prop {string} [id] - The ID of the category to edit (undefined if creating a new category).
   * @prop {string} [name] - The name of the category (used when editing).
   * @prop {(id: string) => *} [onsubmit] - Callback function to call when a category is created.
   * @prop {() => *} [onclose] - Callback function to call when the modal is closed.
   */

  /** @type {Props & Record<string, any>} */
  let { open = $bindable(false), id, name = "", ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { onsubmit, onclose, ...rest } = props;

  let error_message = $state("");

  const is_creating = $derived(!id);

  async function saveCategory() {
    const result = await Api.cats.save({ id, name });
    if (!result.ok) return (error_message = result.error);

    open = false;

    if (onsubmit) onsubmit(result.value.id);
    name = "";
  }

  function handleClose() {
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveCategory} class="*:space-y-4" {...rest}>
  <ModalHeader>{is_creating ? t("create_new_category") : t("edit_category")}</ModalHeader>
  <InputText
    value={name}
    onchange={(value) => (name = value)}
    focus_on_mount
    maxlength="50"
    placeholder={t("choose_category_name")}
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />

  {#if error_message}
    <p class="text-sm text-error">{error_message}</p>
  {/if}

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto" type="submit">
    <Icon name={is_creating ? "plus" : "save"} size={20} />
    <span>{is_creating ? t("create") : t("save")}</span>
  </button>
</Modal>
