<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {(created: { key: string, api_key: AL.ApiKey }) => *} oncreated - Called with the new key's plaintext and record.
   */

  /** @type {Props} */
  const { oncreated } = $props();

  let label = $state("");
  let busy = $state(false);
  const can_create = $derived(!!label.trim() && !busy);

  /** @param {SubmitEvent} event */
  async function handleSubmit(event) {
    event.preventDefault();
    if (!can_create) return;

    busy = true;
    const result = await Api.api_keys.create(label);
    busy = false;
    if (!result.ok) return toast.error(result.error);

    label = "";
    oncreated(result.value);
  }
</script>

<form class="flex gap-2" onsubmit={handleSubmit}>
  <InputText
    value={label}
    maxlength={50}
    enterkeyhint="done"
    aria-label={t("api_key_label_placeholder")}
    placeholder={t("api_key_label_placeholder")}
    onchange={(/** @type {string} */ value) => (label = value)}
  />
  <button
    type="submit"
    disabled={!can_create}
    class={[
      "h-12 shrink-0 px-4 rounded-lg font-semibold flex items-center gap-1 bg-primary",
      !can_create && "opacity-50 cursor-not-allowed",
    ]}
  >
    {#if busy}
      <Icon name="loading" size={18} class="animate-spin" />
    {:else}
      <Icon name="plus" size={18} />
    {/if}
    {t("api_key_create")}
  </button>
</form>
