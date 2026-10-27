<script>
  import { ContactPicker, can_pick_contact } from "$services/contact-picker";
  import InputText from "$display/comps/input/InputText.svelte";
  import { context } from "$logic/context.svelte";
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
  /** The e-mail that is not on Doenit yet, once we know. */
  let not_on_doenit = $state("");
  let is_email_sent = $state(false);

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
      if (result.error === "invite_error_no_user") not_on_doenit = email.trim().toLowerCase();
      else error_message = t(result.error);
      return;
    }

    sent_invite = result.value;
  }

  async function handlePickContact() {
    error_message = "";
    try {
      const picked = await ContactPicker.pickEmail();
      if (!picked.email) return;

      email = picked.email;
      contact_name = picked.name ?? "";
      await handleSend();
    } catch (error) {
      error_message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleInviteToDoenit() {
    if (is_loading) return;

    error_message = "";
    is_loading = true;
    const result = await Api.invites.sendEmail(not_on_doenit).finally(() => (is_loading = false));
    if (!result.ok) {
      error_message = t(result.error);
      return;
    }

    is_email_sent = true;
  }

  /** @param {string} [to_email] */
  async function handleShare(to_email) {
    const name = context.user?.name || context.user?.email_address || "";
    const message = to_email
      ? t("invite_share_message", { name, email: to_email })
      : t("invite_share_message_generic", { name });
    const result = await Api.share.text(message);
    if (!result.ok) error_message = t("sharing_not_supported");
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
    if (not_on_doenit) return is_email_sent ? undefined : handleInviteToDoenit();
    return sent_invite ? handleSaveName() : handleSend();
  }

  function handleClose() {
    error_message = "";
    email = "";
    contact_name = "";
    sent_invite = null;
    not_on_doenit = "";
    is_email_sent = false;
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
  {:else if not_on_doenit}
    <ModalHeader>{t("invite_to_doenit")}</ModalHeader>
    <p class="text-sm text-muted">
      {is_email_sent ? t("email_invite_sent", { email: not_on_doenit }) : t("not_on_doenit_yet", { email: not_on_doenit })}
    </p>

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <div class="flex gap-2 justify-between">
      <button
        type="button"
        class="px-4 py-2 rounded-md bg-card flex gap-1 items-center whitespace-nowrap"
        onclick={() => handleShare(not_on_doenit)}
      >
        <Icon name="share" size={20} />
        {is_email_sent ? t("send_message_too") : t("share_invite_link")}
      </button>
      {#if !is_email_sent}
        <button
          class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md whitespace-nowrap disabled:opacity-50"
          type="submit"
          disabled={is_loading}
        >
          <Icon name="send" size={20} />
          <span class="font-medium">{t("invite_to_doenit")}</span>
        </button>
      {/if}
    </div>
  {:else}
    <ModalHeader>{t("send_invite")}</ModalHeader>

    {#if can_pick_contact}
      <button
        type="button"
        class="w-full h-11 bg-card border-default border rounded-md flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
        disabled={is_loading}
        onclick={handlePickContact}
      >
        <Icon name="contacts" size={20} />
        {t("pick_from_contacts")}
      </button>

      {@render divider()}
    {/if}

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

    <button
      class="w-full h-11 bg-primary text-alt rounded-md flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
      type="submit"
      disabled={is_loading}
    >
      <Icon name="send" size={20} />
      <span class="font-medium">{t("send")}</span>
    </button>

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    {@render divider()}

    <button
      type="button"
      class="w-full h-11 bg-card border-default border rounded-md flex items-center justify-center gap-2 whitespace-nowrap"
      onclick={() => handleShare()}
    >
      <Icon name="share" size={20} />
      {t("share_invite_link")}
    </button>
  {/if}
</Modal>

{#snippet divider()}
  <div class="flex items-center gap-3 text-sm text-muted">
    <hr class="flex-1 border-default" />
    {t("or")}
    <hr class="flex-1 border-default" />
  </div>
{/snippet}
