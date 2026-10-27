<script>
  import ModalHeader from "./ModalHeader.svelte";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import t from "$display/translate";
  import toast from "$display/toast/toast.svelte";
  import Icon from "../Icon.svelte";

  /**
   * Asks a new user whether to connect with the people who invited them by e-mail. Mounted after sign-in.
   * @typedef {Object} Props
   * @prop {{ uid: string; from_email: string; from_name: string }[]} senders
   */

  /** @type {Props} */
  const { senders } = $props();

  let is_open = $state(true);
  let is_loading = $state(false);

  const names = $derived(senders.map((s) => s.from_name || s.from_email).join(", "));

  /** @param {boolean} accept */
  async function answer(accept) {
    if (is_loading) return;

    is_loading = true;
    const result = await Api.invites.answerEmailInvites(senders, accept).finally(() => (is_loading = false));
    if (!result.ok) toast.error(t("something_went_wrong"), result.error);
    is_open = false;
  }
</script>

<Modal bind:is_open close_on_outside_click={false} onclose={() => answer(false)} class="*:space-y-4">
  <div class="flex flex-col items-center gap-2 text-center">
    <div class="rounded-full bg-primary/15 text-primary p-3">
      <Icon name="user-plus" size={40} />
    </div>
    <ModalHeader>{t("invited_by_title")}</ModalHeader>
  </div>
  <p class="text-sm text-muted text-center">{t("invited_by_body", { names })}</p>

  <div class="flex gap-2 justify-between">
    <button type="button" class="px-4 py-2 rounded-md bg-card" disabled={is_loading} onclick={() => answer(false)}>
      {t("skip")}
    </button>
    <button
      type="button"
      class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md disabled:opacity-50"
      disabled={is_loading}
      onclick={() => answer(true)}
    >
      <Icon name="check" size={20} />
      <span class="font-medium">{t("connect")}</span>
    </button>
  </div>
</Modal>
