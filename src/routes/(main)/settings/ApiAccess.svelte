<script>
  import Accordion from "$display/comps/button/Accordion.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import { DOCS_URL, MAX_KEYS } from "$logic/api/api-keys";
  import { Browser } from "@capacitor/browser";
  import { Toast } from "@capacitor/toast";
  import { mount, unmount } from "svelte";
  import ModalDeleteApiKey from "./comps/ModalDeleteApiKey.svelte";
  import CardApiKey from "./comps/CardApiKey.svelte";
  import FormCreateApiKey from "./comps/FormCreateApiKey.svelte";
  import NewApiKey from "./comps/NewApiKey.svelte";
  import ApiDeveloperInfo from "./comps/ApiDeveloperInfo.svelte";

  let show = $state(false);
  /** The API needs Sync, so tasks sent through it reach every device. */
  const disabled_message = $derived(
    !context.user ? t("sign_in_to_use") : !Api.personal_sync.isEnabled() ? t("api_requires_sync") : "",
  );
  let loaded = $state(false);
  let loading = $state(false);
  let load_failed = $state(false);
  /** @type {AL.ApiKey[]} */
  let keys = $state([]);
  /** A key that was just created. Its plaintext is only shown once, until the user taps Done. */
  let new_key = $state({ key: "", label: "" });

  const at_limit = $derived(keys.length >= MAX_KEYS);

  // Keys are only fetched once the section is opened, so the settings page costs no Firestore reads.
  $effect(() => {
    if (show && !loaded) load();
  });

  async function load() {
    loaded = true;
    loading = true;
    load_failed = false;
    const result = await Api.api_keys.list();
    loading = false;
    if (!result.ok) {
      load_failed = true;
      return;
    }
    keys = result.value;
  }

  /** @param {{ key: string, api_key: AL.ApiKey }} created */
  function handleCreated({ key, api_key }) {
    keys = [...keys, api_key];
    new_key = { key, label: api_key.label };
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
    Toast.show({ text: t("api_key_revoked"), duration: "short" });
  }

  function openDocs() {
    Browser.open({ url: DOCS_URL });
  }
</script>

<Accordion label={t("api_access")} bind:show {loading} disabled={!!disabled_message} {disabled_message}>
  <div class="space-y-4 text-sm">
    <p class="text-muted">
      {t("api_intro")}
      <button type="button" class="text-primary font-medium" onclick={openDocs}>{t("api_how_it_works")}</button>
    </p>

    {#if new_key.key}
      <NewApiKey key={new_key.key} label={new_key.label} ondone={() => (new_key = { key: "", label: "" })} />
    {/if}

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="font-semibold">{t("api_keys")}</p>
        {#if !loading && !load_failed}
          <span class={["text-xs rounded-full bg-card px-2 py-0.5", at_limit ? "text-warning" : "text-muted"]}>
            {keys.length} / {MAX_KEYS}
          </span>
        {/if}
      </div>

      {#if load_failed}
        <div class="bg-card rounded-lg p-3 flex items-center justify-between gap-2">
          <p class="text-muted">{t("api_load_failed")}</p>
          <button type="button" class="shrink-0 text-primary font-medium" onclick={load}>{t("try_again")}</button>
        </div>
      {:else if !loading && !keys.length}
        <p class="text-muted text-center border border-dashed border-default rounded-lg p-4">{t("api_no_keys")}</p>
      {/if}

      {#each keys as key (key.id)}
        <CardApiKey {key} onrevoke={confirmRevoke} />
      {/each}

      {#if load_failed || loading}
        <!-- Nothing to create against until the list is known. -->
      {:else if at_limit}
        <p class="text-muted text-xs">{t("api_keys_limit_info")}</p>
      {:else}
        <FormCreateApiKey oncreated={handleCreated} />
      {/if}
    </div>

    <ApiDeveloperInfo new_key={new_key.key} onopendocs={openDocs} />
  </div>
</Accordion>
