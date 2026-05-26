<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Modal from "$display/comps/modal/Modal.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [id]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {(name: string, description: string) => *} [onsubmit]
   * @prop {() => *} [onclose]
   */

  /** @type {Props} */
  let { open = $bindable(false), id, name = "", description = "", onsubmit, onclose } = $props();

  let local_name = $state(name);
  let local_description = $state(description);
  let error_message = $state("");

  $effect(() => {
    if (open) {
      local_name = name;
      local_description = description;
      error_message = "";
    }
  });

  async function handleSave() {
    error_message = "";
    const result = await Api.groups.save({ id, name: local_name, description: local_description });
    if (!result.ok) return (error_message = result.error);
    if (onsubmit) await onsubmit(result.value.name, result.value.description);
    open = false;
  }
</script>

<Modal bind:is_open={open} {onclose} onsubmit={handleSave}>
  <ModalHeader>{t("edit_group")}</ModalHeader>

  <div class="space-y-3 mt-4">
    <InputText
      value={local_name}
      onchange={(v) => (local_name = v)}
      maxlength="100"
      placeholder={t("enter_group_name")}
      focus_on_mount
      onfocus={() => (error_message = "")}
      class={{ "placeholder:text-error! border-error! bg-error/20!": !!error_message }}
    />

    <textarea
      bind:value={local_description}
      maxlength="250"
      placeholder={t("enter_group_description")}
      rows="3"
      class="bg-card border border-default p-2 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary resize-none"
    ></textarea>

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto" type="submit">
      <Icon name="save" size={20} />
      <span>{t("save")}</span>
    </button>
  </div>
</Modal>
