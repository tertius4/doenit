<script>
  import Accordion from "$display/comps/button/Accordion.svelte";
  import Button from "$display/comps/button/Button.svelte";
  import InputText from "$display/comps/input/InputText.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { API_URL, DOCS_URL, MAX_KEYS } from "$logic/api/api-keys";
  import { Browser } from "@capacitor/browser";
  import { mount, unmount } from "svelte";
  import ModalDeleteApiKey from "./comps/ModalDeleteApiKey.svelte";

  let show = $state(false);
  let loaded = $state(false);
  let busy = $state(false);
  let label = $state("");
  /** @type {AL.ApiKey[]} */
  let keys = $state([]);
  /** The plaintext of a key that was just created. It is only shown once. */
  let new_key = $state("");

  const example = $derived(
    `curl -X POST ${API_URL} \\\n  -H "Authorization: Bearer ${new_key || "dk_..."}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Buy milk"}'`,
  );

  // Keys are only fetched once the section is opened, so the settings page costs no Firestore reads.
  $effect(() => {
    if (show && !loaded) load();
  });

  async function load() {
    loaded = true;
    const result = await Api.api_keys.list();
    if (!result.ok) return toast.error(result.error);
    keys = result.value;
  }

  async function createKey() {
    if (busy) return;

    busy = true;
    const result = await Api.api_keys.create(label);
    busy = false;
    if (!result.ok) return toast.error(result.error);

    keys = [...keys, result.value.api_key];
    new_key = result.value.key;
    label = "";
  }

  /** @param {AL.ApiKey} key */
  function confirmRevoke(key) {
    const component = mount(ModalDeleteApiKey, {
      target: document.body,
      props: { label: key.label, onconfirm: () => revoke(key), onclose: () => unmount(component) },
    });
  }

  /** @param {AL.ApiKey} key */
  async function revoke(key) {
    const result = await Api.api_keys.revoke(key.id);
    if (!result.ok) return toast.error(result.error);

    keys = keys.filter(({ id }) => id !== key.id);
    toast.success(t("api_key_revoked"));
  }

  /** @param {string} text */
  async function copy(text) {
    const result = await Api.clipboard.copy(text);
    if (!result.ok) toast.error(t("copy_failed"));
  }

  /** @param {string | undefined} date */
  function formatDate(date) {
    return date ? new Date(date).toLocaleDateString() : t("api_key_never_used");
  }
</script>

<Accordion label={t("api_access")} bind:show>
  <div class="space-y-4 text-sm">
    <div class="bg-card rounded-md p-3 space-y-2">
      <p class="font-semibold flex items-center gap-2">
        <Icon name="info" size={18} />
        {t("api_when_title")}
      </p>
      <p>{t("api_when_body")}</p>
      <p class="text-muted">{t("api_when_devices")}</p>
    </div>

    {#if new_key}
      <div class="border border-default rounded-md p-3 space-y-2">
        <p class="font-semibold">{t("api_key_created")}</p>
        <p class="text-muted">{t("api_key_shown_once")}</p>
        <code class="block break-all bg-card rounded p-2 select-all">{new_key}</code>
        <Button onclick={() => copy(new_key)}>{t("api_key_copy")}</Button>
      </div>
    {/if}

    <div class="space-y-2">
      <p class="font-semibold">{t("api_keys")}</p>
      {#if loaded && !keys.length}
        <p class="text-muted">{t("api_no_keys")}</p>
      {/if}
      {#each keys as key (key.id)}
        <div class="flex items-center gap-2 bg-card rounded-md p-3">
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{key.label}</p>
            <p class="text-muted text-xs">{key.prefix} · {t("api_key_last_used")}: {formatDate(key.last_used_at)}</p>
          </div>
          <button
            type="button"
            class="px-3 py-2 rounded-md border border-default text-xs"
            onclick={() => confirmRevoke(key)}
          >
            {t("api_key_revoke")}
          </button>
        </div>
      {/each}
    </div>

    {#if keys.length < MAX_KEYS}
      <div class="space-y-2">
        <InputText
          value={label}
          maxlength={50}
          placeholder={t("api_key_label_placeholder")}
          onchange={(/** @type {string} */ value) => (label = value)}
        />
        <Button onclick={createKey} disabled={busy || !label.trim()}>
          <Icon name="plus" size={20} />
          {t("api_key_create")}
        </Button>
      </div>
    {/if}

    <div class="space-y-2">
      <p class="font-semibold">{t("api_example")}</p>
      <pre class="bg-card rounded-md p-3 text-xs overflow-x-auto whitespace-pre">{example}</pre>
      <Button onclick={() => copy(example)}>{t("api_example_copy")}</Button>
    </div>

    <Button onclick={() => Browser.open({ url: DOCS_URL })}>{t("api_read_docs")}</Button>
  </div>
</Accordion>
