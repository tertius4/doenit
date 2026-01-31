<script>
  import InputText from "../element/input/InputText.svelte";
  import { t } from "$lib/services/language.svelte";
  import Modal from "./Modal.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { DB } from "$lib/DB";

  /**
   * @typedef {Object} Props
   * @property {boolean} [open=false] - Whether the modal is open.
   * @property {(name: string) => *} [oncreate] - Callback function to call when a category is created.
   * @property {() => *} [onclose] - Callback function to call when the modal is closed.
   */

  /** @type {Props} */
  let { open = $bindable(false), oncreate, onclose } = $props();

  let new_category_name = $state("");
  let error_message = $state("");

  async function addCategory() {
    if (!new_category_name.trim()) {
      error_message = t("enter_category_name");
      return;
    }

    open = false;
    const category = await DB.Category.create({
      name: new_category_name.trim(),
      is_default: false,
      users: [],
    });

    new_category_name = "";
    open = false;
    if (!oncreate) return;

    await oncreate(category.id);
  }

  function handleClose() {
    if (onclose) onclose();
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={addCategory}>
  <h2 class="text-lg font-semibold mb-4 leading-none">{t("create_new_category")}</h2>
  <InputText
    bind:value={new_category_name}
    focus_on_mount
    maxlength="50"
    placeholder={t("choose_category_name")}
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto mt-4" type="submit">
    <Icon name="plus" />
    <span>{t("create")}</span>
  </button>
</Modal>
