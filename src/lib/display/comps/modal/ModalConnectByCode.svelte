<script>
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import t from "$display/translate";
  import toast from "$display/toast/toast.svelte";
  import Icon from "../Icon.svelte";
  import { onMount } from "svelte";
  
  /** @typedef {import("$display/translate").TranslationKey} TranslationKey */
  /**
   * Asks whether to connect with the owner of an invite code, from a link, a QR code or one typed in.
   * Mounted by the main layout while a code is waiting.
   * @typedef {Object} Props
   * @prop {string} code
   * @prop {() => void} onclose
   */

  /** @type {Props} */
  const { code, onclose } = $props();

  let is_open = $state(true);
  let is_loading = $state(true);
  let error_message = $state("");
  let owner = $state(/** @type {{ uid: string; email_address: string; name: string } | null} */ (null));

  const display_name = $derived(owner?.name || owner?.email_address || "");

  onMount(async () => {
    const result = await Api.invites.lookupCode(code).finally(() => (is_loading = false));
    if (!result.ok) error_message = t(/** @type {TranslationKey} */ (result.error));
    else owner = result.value;
  });

  async function connect() {
    if (is_loading || !owner) return;

    is_loading = true;
    const result = await Api.invites.sendByCode(code).finally(() => (is_loading = false));
    if (!result.ok) {
      error_message = t(/** @type {TranslationKey} */ (result.error));
      return;
    }

    toast.success(t("connect_request_sent", { name: display_name }));
    close();
  }

  function close() {
    is_open = false;
    onclose();
  }
</script>

<Modal bind:is_open close_on_outside_click={false} onclose={close} class="*:space-y-4">
  <div class="flex flex-col items-center gap-3 text-center">
    {#if is_loading && !owner}
      <Icon name="loading" size={40} class="animate-spin text-muted" />
    {:else if owner}
      <span class="h-18 w-18 rounded-full bg-primary text-alt text-3xl font-bold flex items-center justify-center uppercase">
        {display_name.trim().charAt(0)}
      </span>
      <ModalHeader>{t("wants_to_share_tasks", { name: display_name })}</ModalHeader>
      <p class="text-sm text-muted">{t("connect_by_code_body")}</p>
    {:else}
      <div class="rounded-full bg-error/15 text-error p-3">
        <Icon name="x-circle" size={40} />
      </div>
      <ModalHeader>{t("invite_code_problem")}</ModalHeader>
    {/if}
  </div>

  {#if error_message}
    <p class="text-sm text-error text-center">{error_message}</p>
  {/if}

  {#if owner}
    <div class="flex flex-col gap-2">
      <button
        type="button"
        class="h-12 bg-primary text-alt rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50"
        disabled={is_loading}
        onclick={connect}
      >
        {#if is_loading}
          <Icon name="loading" size={20} class="animate-spin" />
        {:else}
          <Icon name="check" size={20} />
        {/if}
        {t("connect_with", { name: display_name })}
      </button>
      <button type="button" class="h-11 rounded-xl text-muted" onclick={close}>{t("not_now")}</button>
    </div>
  {:else if !is_loading}
    <button type="button" class="w-full h-11 rounded-xl bg-card" onclick={close}>{t("close")}</button>
  {/if}
</Modal>
