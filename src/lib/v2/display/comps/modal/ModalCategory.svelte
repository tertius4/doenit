<script>
  import InputText from "$lib/components/element/input/InputText.svelte";
  import t from "$display/translate";
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false] - Whether the modal is open.
   * @prop {{ id: string, name: string }} [category] - The category to edit. If not provided, a new category will be created.
   * @prop {(name: string) => *} [onsubmit] - Callback function to call when a category is created.
   * @prop {() => *} [onclose] - Callback function to call when the modal is closed.
   */

  /** @type {Props & Record<string, any>} */
  let { open = $bindable(false), ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { onsubmit, onclose, category, ...rest } = props;

  let name = $state(category?.name ?? "");
  let error_message = $state("");

  const is_creating = $derived(!category);

  async function saveCategory() {
    const result = await Api.cats.save({ id: category?.id, name });
    if (!result.ok) return (error_message = result.error);

    name = "";
    open = false;

    if (onsubmit) onsubmit(result.value.id);
  }

  function handleClose() {
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveCategory} class="space-y-4" {...rest}>
  <ModalHeader>{is_creating ? t("create_new_category") : t("edit_category")}</ModalHeader>
  <InputText
    bind:value={name}
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
