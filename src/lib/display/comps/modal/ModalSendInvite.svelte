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

    email = "";
    open = false;
  }

  function handleClose() {
    error_message = "";
    email = "";
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={handleSend} class="*:space-y-4">
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
</Modal>
