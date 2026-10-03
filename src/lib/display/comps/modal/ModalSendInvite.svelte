<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import t from "$display/translate";
  import Icon from "../Icon.svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   */

  /** @type {Props} */
  let { open = $bindable(false) } = $props();

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let email = $state("");
  let error_message = $state("");
  let is_loading = $state(false);
  /** @type {DB.ContactInvite | null} */
  let sent_invite = $state(null);
  let contact_name = $state("");

  async function handleSend() {
    error_message = "";
    if (!email.trim()) {
      error_message = t("contact_email_required");
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      error_message = t("invalid_email");
      return;
    }

    if (is_loading) return;

    is_loading = true;
    const result = await Api.invites.send(email.trim().toLowerCase()).finally(() => (is_loading = false));

    if (!result.ok) {
      error_message = result.error;
      return;
    }

    sent_invite = result.value;
  }

  async function handleSaveName() {
    if (!sent_invite || is_loading) return;

    if (contact_name.trim()) {
      is_loading = true;
      const result = await Api.invites.setContactName(sent_invite.id, contact_name).finally(() => (is_loading = false));
      if (!result.ok) {
        error_message = result.error;
        return;
      }
    }

    open = false;
  }

  // Modal reads its onsubmit prop once, so branch here instead of swapping handlers.
  function handleSubmit() {
    return sent_invite ? handleSaveName() : handleSend();
  }

  function handleClose() {
    error_message = "";
    email = "";
    contact_name = "";
    sent_invite = null;
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={handleSubmit} class="*:space-y-4">
  {#if sent_invite}
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="rounded-full bg-success/15 text-success p-3">
        <Icon name="check-circle" size={40} />
      </div>
      <ModalHeader>{t("invite_sent_successfully")}</ModalHeader>
    </div>
    <p class="text-sm text-muted">{t("invite_sent_to", { email: sent_invite.to_email })}</p>

    <InputText
      value={contact_name}
      onchange={(value) => (contact_name = value)}
      focus_on_mount
      maxlength="100"
      placeholder={t("add_contact_name_optional")}
    />

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <div class="flex gap-2 justify-between">
      <button type="button" class="px-4 py-2 rounded-md bg-card" onclick={() => (open = false)}>
        {t("skip")}
      </button>
      <button
        class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md disabled:opacity-50"
        type="submit"
        disabled={is_loading || !contact_name.trim()}
      >
        <Icon name="save" size={20} />
        <span class="font-medium">{t("save")}</span>
      </button>
    </div>
  {:else}
    <ModalHeader>{t("send_invite")}</ModalHeader>

    <InputText
      value={email}
      onchange={(value) => (email = value)}
      focus_on_mount
      maxlength="200"
      inputmode="email"
      autocomplete="email"
      placeholder={t("email_address")}
      onfocus={() => (error_message = "")}
      class={{
        "placeholder:text-error! border-error! bg-error/20!": !email && !!error_message,
      }}
    />

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <button
      class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto disabled:opacity-50"
      type="submit"
      disabled={is_loading}
    >
      <Icon name="send" size={20} />
      <span class="font-medium">{t("send_invite")}</span>
    </button>
  {/if}
</Modal>
