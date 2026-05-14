<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   */

  /** @type {Props} */
  let { open = $bindable(false) } = $props();

  let email = $state("");
  let error_message = $state("");
  let is_loading = $state(false);

  async function handleSend() {
    error_message = "";
    if (!email.trim()) {
      error_message = "Email address is required";
      return;
    }

    is_loading = true;
    const result = await Api.invites.send(email.trim().toLowerCase());
    is_loading = false;

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
  <ModalHeader>Send Invite</ModalHeader>

  <InputText
    value={email}
    onchange={(value) => (email = value)}
    focus_on_mount
    maxlength="200"
    placeholder="Email address"
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !email && !!error_message,
    }}
  />

  {#if error_message}
    <p class="text-sm text-error">{error_message}</p>
  {/if}
</Modal>
