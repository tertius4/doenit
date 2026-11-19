<script>
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { slide } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @prop {string} key - The plaintext key. It is only shown here, once.
   * @prop {string} label - The key's name.
   * @prop {() => *} ondone - Called when the user taps Done.
   */

  /** @type {Props} */
  const { key, label, ondone } = $props();

  async function copy() {
    const result = await Api.clipboard.copy(key);
    if (!result.ok) toast.error(t("copy_failed"));
  }
</script>

<div transition:slide class="border border-success bg-page rounded-lg p-3 space-y-2">
  <p class="font-semibold text-success flex items-center gap-2">
    <Icon name="check-circle" size={18} />
    {t("api_key_created", { label })}
  </p>
  <div class="flex items-center bg-card border border-default rounded-lg">
    <code class="flex-1 min-w-0 px-3 py-2 truncate">{key}</code>
    <button
      type="button"
      class="shrink-0 h-10 px-3 flex items-center gap-1 text-primary font-semibold"
      aria-label={t("api_key_copy")}
      onclick={copy}
    >
      <Icon name="copy" size={18} />
      <span>{t("copy")}</span>
    </button>
  </div>
  <p class="text-warning text-xs flex items-start gap-1">
    <Icon name="important" size={16} class="shrink-0" />
    {t("api_key_shown_once")}
  </p>
  <div class="flex justify-end">
    <button type="button" class="h-10 px-4 border border-default rounded-lg" onclick={ondone}>
      {t("api_key_done")}
    </button>
  </div>
</div>
