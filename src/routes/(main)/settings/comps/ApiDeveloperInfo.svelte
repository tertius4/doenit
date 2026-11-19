<script>
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { API_URL } from "$logic/api/api-keys";

  /**
   * @typedef {Object} Props
   * @prop {string} [new_key=""] - A key that was just created, so the example can be copied ready to use.
   * @prop {() => *} onopendocs - Opens the API documentation.
   */

  /** @type {Props} */
  const { new_key = "", onopendocs } = $props();

  const example = $derived(
    `curl -X POST ${API_URL} \\\n  -H "Authorization: Bearer ${new_key || "dk_..."}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "${t("api_example_task")}"}'`,
  );

  async function copy() {
    const result = await Api.clipboard.copy(example);
    if (!result.ok) toast.error(t("copy_failed"));
  }
</script>

<details class="group border border-default rounded-lg">
  <summary class="list-none cursor-pointer p-3 flex items-center justify-between font-semibold">
    {t("api_dev_title")}
    <Icon name="chevron-down" size={20} class="transition-transform group-open:rotate-180" />
  </summary>
  <div class="px-3 pb-3 space-y-3">
    <div class="space-y-1">
      <p class="text-muted">{t("api_example")}</p>
      <div class="relative">
        <pre class="bg-card rounded-lg p-3 pr-12 text-xs overflow-x-auto whitespace-pre">{example}</pre>
        <button
          type="button"
          class="absolute top-1 right-1 p-2 text-primary"
          aria-label={t("api_example_copy")}
          onclick={copy}
        >
          <Icon name="copy" size={18} />
        </button>
      </div>
    </div>
    <p class="text-muted text-xs">{t("api_when_body")} {t("api_when_devices")}</p>
    <button type="button" class="text-primary font-medium flex items-center gap-1" onclick={onopendocs}>
      <Icon name="file-lines" size={18} />
      {t("api_read_docs")}
    </button>
  </div>
</details>
