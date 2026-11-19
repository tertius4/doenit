<script>
  import { ContactPicker, can_pick_contact } from "$services/contact-picker";
  import InputText from "$display/comps/input/InputText.svelte";
  import { context } from "$logic/context.svelte";
  import { formatCode, inviteLink, normalizeCode, pendingInvite } from "$logic/invites/invite-code.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import t from "$display/translate";
  import Icon from "../Icon.svelte";
  import QRCode from "qrcode";
  
  /** @typedef {import("$display/translate").TranslationKey} TranslationKey */
  
  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   */

  /** @type {Props} */
  let { open = $bindable(false) } = $props();

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** @type {"menu" | "qr" | "enter" | "email"} */
  let view = $state("menu");
  let error_message = $state("");
  let is_loading = $state(false);

  /** My invite code, loaded the first time it is needed. */
  /** @type {string | null} */
  let my_code = $state(null);
  let qr_svg = $state("");
  let typed_code = $state("");

  let email = $state("");
  /** @type {DB.ContactInvite | null} */
  let sent_invite = $state(null);
  let contact_name = $state("");
  /** The e-mail that is not on Doenit yet, once we know. */
  let not_on_doenit = $state("");
  let is_email_sent = $state(false);

  /** @returns {Promise<string | null>} */
  async function loadCode() {
    if (my_code) return my_code;

    is_loading = true;
    const result = await Api.invites.myCode().finally(() => (is_loading = false));
    if (!result.ok) {
      error_message = t(/** @type {TranslationKey} */ (result.error));
      return null;
    }

    my_code = result.value;
    return my_code;
  }

  async function handleShareLink() {
    error_message = "";
    const code = await loadCode();
    if (!code) return;

    const name = context.user?.name || context.user?.email_address || "";
    const message = t("invite_link_message", { name, code: formatCode(code) });
    const result = await Api.share.text(message, inviteLink(code));
    if (!result.ok) error_message = t("sharing_not_supported");
  }

  async function showQr() {
    error_message = "";
    const code = await loadCode();
    if (!code) return;

    view = "qr";
    await drawQr(code);
  }

  /** @param {string} code */
  async function drawQr(code) {
    qr_svg = await QRCode.toString(inviteLink(code), {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1e1e24", light: "#fcfcfc" },
    });
  }

  async function copyCode() {
    if (!my_code) return;
    await Api.clipboard.copy(formatCode(my_code), t("code_copied"));
  }

  async function handleResetCode() {
    if (is_loading) return;

    error_message = "";
    is_loading = true;
    const result = await Api.invites.resetCode().finally(() => (is_loading = false));
    if (!result.ok) {
      error_message = t(/** @type {TranslationKey} */ (result.error));
      return;
    }

    my_code = result.value;
    await drawQr(result.value);
  }

  function handleEnterCode() {
    const code = normalizeCode(typed_code);
    if (!code) {
      error_message = t("invite_error_code_invalid");
      return;
    }

    // ModalConnectByCode (mounted by the layout) asks who it is and connects.
    pendingInvite.code = code;
    open = false;
  }

  async function handleSendEmail() {
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
      else error_message = t(/** @type {TranslationKey} */ (result.error));
      return;
    }

    sent_invite = result.value;
  }

  async function handlePickContact() {
    error_message = "";
    try {
      const picked = await ContactPicker.pickEmail();
      if (!picked.email) return;

      view = "email";
      email = picked.email;
      contact_name = picked.name ?? "";
      await handleSendEmail();
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
      error_message = t(/** @type {TranslationKey} */ (result.error));
      return;
    }

    is_email_sent = true;
  }

  /** @param {string} to_email */
  async function handleShareToEmail(to_email) {
    const name = context.user?.name || context.user?.email_address || "";
    const result = await Api.share.text(t("invite_share_message", { name, email: to_email }));
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
    if (view === "enter") return handleEnterCode();
    if (view !== "email") return;
    if (not_on_doenit) return is_email_sent ? undefined : handleInviteToDoenit();
    return sent_invite ? handleSaveName() : handleSendEmail();
  }

  /** @param {"menu" | "qr" | "enter" | "email"} next */
  function go(next) {
    error_message = "";
    view = next;
  }

  function handleClose() {
    view = "menu";
    error_message = "";
    typed_code = "";
    email = "";
    contact_name = "";
    sent_invite = null;
    not_on_doenit = "";
    is_email_sent = false;
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={handleSubmit} class="*:space-y-4">
  {#if view === "menu"}
    <div class="space-y-1">
      <ModalHeader>{t("invite_a_friend")}</ModalHeader>
      <p class="text-sm text-muted">{t("invite_no_email_needed")}</p>
    </div>

    <button
      type="button"
      class="w-full flex items-center gap-3 p-4 rounded-xl bg-primary text-alt text-left disabled:opacity-50"
      disabled={is_loading}
      onclick={handleShareLink}
    >
      <span class="shrink-0 h-11 w-11 rounded-full bg-white/20 flex items-center justify-center">
        {#if is_loading}
          <Icon name="loading" size={22} class="animate-spin" />
        {:else}
          <Icon name="share" size={22} />
        {/if}
      </span>
      <span class="flex flex-col">
        <span class="font-semibold">{t("share_invite_link_title")}</span>
        <span class="text-sm opacity-90">{t("share_invite_link_hint")}</span>
      </span>
    </button>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="flex flex-col items-start gap-2 p-3 rounded-xl bg-card border border-default text-left disabled:opacity-50"
        disabled={is_loading}
        onclick={showQr}
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-primary"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </svg>
        <span class="flex flex-col">
          <span class="font-semibold">{t("show_qr_code")}</span>
          <span class="text-xs text-muted">{t("show_qr_code_hint")}</span>
        </span>
      </button>
      <button
        type="button"
        class="flex flex-col items-start gap-2 p-3 rounded-xl bg-card border border-default text-left"
        onclick={() => go("enter")}
      >
        <Icon name="edit" size={22} class="text-primary" />
        <span class="flex flex-col">
          <span class="font-semibold">{t("enter_invite_code")}</span>
          <span class="text-xs text-muted">{t("enter_invite_code_hint")}</span>
        </span>
      </button>
    </div>

    {#if can_pick_contact}
      <button
        type="button"
        class="w-full h-14 px-3 flex items-center gap-3 rounded-xl bg-card border border-default disabled:opacity-50"
        disabled={is_loading}
        onclick={handlePickContact}
      >
        <Icon name="contacts" size={22} class="text-primary" />
        <span class="grow text-left font-medium">{t("pick_from_contacts")}</span>
        <Icon name="chevron-right" size={18} class="text-muted" />
      </button>
    {/if}

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    {@render divider(t("other_ways"))}

    <button type="button" class="w-full h-12 px-3 flex items-center gap-3 rounded-xl" onclick={() => go("email")}>
      <Icon name="mail" size={20} class="text-muted" />
      <span class="grow text-left">{t("invite_by_email")}</span>
      <Icon name="chevron-right" size={18} class="text-muted" />
    </button>
  {:else if view === "qr"}
    {@render back(t("let_them_scan"))}
    <p class="text-sm text-muted">{t("let_them_scan_hint")}</p>

    <div class="mx-auto w-60 aspect-square rounded-2xl bg-[#fcfcfc] p-3 flex items-center justify-center">
      {#if qr_svg}
        <div class="w-full h-full *:w-full *:h-full" role="img" aria-label={t("show_qr_code")}>{@html qr_svg}</div>
      {:else}
        <Icon name="loading" size={32} class="animate-spin text-[#1e1e24]" />
      {/if}
    </div>

    {#if my_code}
      <div class="flex flex-col items-center gap-1">
        <span class="text-xs uppercase tracking-wide text-muted">{t("or_give_them_code")}</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-3xl font-semibold tracking-widest">{formatCode(my_code)}</span>
          <button
            type="button"
            class="h-11 w-11 rounded-full bg-card flex items-center justify-center"
            aria-label={t("copy_code")}
            title={t("copy_code")}
            onclick={copyCode}
          >
            <Icon name="copy" size={18} class="text-primary" />
          </button>
        </div>
        <button
          type="button"
          class="text-xs text-muted underline disabled:opacity-50"
          disabled={is_loading}
          onclick={handleResetCode}
        >
          {t("new_invite_code")}
        </button>
      </div>
    {/if}

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <button
      type="button"
      class="w-full h-12 bg-primary text-alt rounded-xl flex items-center justify-center gap-2 font-medium"
      onclick={handleShareLink}
    >
      <Icon name="share" size={20} />
      {t("share_link_instead")}
    </button>
  {:else if view === "enter"}
    {@render back(t("enter_invite_code"))}
    <p class="text-sm text-muted">{t("enter_invite_code_body")}</p>

    <InputText
      value={typed_code}
      onchange={(value) => (typed_code = value)}
      focus_on_mount
      maxlength="12"
      autocomplete="off"
      autocapitalize="characters"
      placeholder="K7Q-4MX"
      onfocus={() => (error_message = "")}
      class="font-mono text-2xl text-center tracking-widest uppercase"
    />

    {#if error_message}
      <p class="text-sm text-error">{error_message}</p>
    {/if}

    <button
      class="w-full h-12 bg-primary text-alt rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50"
      type="submit"
      disabled={!typed_code.trim()}
    >
      <Icon name="check" size={20} />
      {t("connect")}
    </button>
  {:else if sent_invite}
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
        onclick={() => (is_email_sent ? handleShareToEmail(not_on_doenit) : handleShareLink())}
      >
        <Icon name="share" size={20} />
        {is_email_sent ? t("send_message_too") : t("share_invite_link_title")}
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
    {@render back(t("invite_by_email"))}

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
  {/if}
</Modal>

{#snippet back(/** @type {string} */ title)}
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="h-10 w-10 -ml-2 rounded-full flex items-center justify-center"
      aria-label={t("back")}
      onclick={() => go("menu")}
    >
      <Icon name="chevron-left" size={20} />
    </button>
    <ModalHeader>{title}</ModalHeader>
  </div>
{/snippet}

{#snippet divider(/** @type {string} */ label)}
  <div class="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
    <hr class="flex-1 border-default" />
    {label}
    <hr class="flex-1 border-default" />
  </div>
{/snippet}
