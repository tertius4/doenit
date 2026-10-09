<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import { context } from "$logic/context.svelte";
  import { createAuthFlow } from "$display/auth.svelte";
  import ButtonsSignIn from "$display/comps/button/ButtonsSignIn.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import toast from "$display/toast/toast.svelte";
  import { mount, unmount } from "svelte";
  import ModalDeleteAccount from "./comps/ModalDeleteAccount.svelte";

  let is_open = $state(false);
  const auth = createAuthFlow();

  const is_logged_in = $derived(context.user?.id);

  // Apple's Hide My Email gives a relay address. It is the only address other users can
  // invite, so it has to be easy to pass on.
  const is_relay_email = $derived(!!context.user?.email_address?.endsWith("@privaterelay.appleid.com"));

  async function copyEmail() {
    const email = context.user?.email_address;
    if (!email) return;

    const result = await Api.clipboard.copy(email);
    if (!result.ok) toast.error(t("copy_failed"));
  }

  async function handleSignOut() {
    is_open = false;
    await auth.signOut();
  }

  function openDeleteAccount() {
    is_open = false;
    const component = mount(ModalDeleteAccount, {
      target: document.body,
      props: { onconfirm: () => auth.deleteAccount(), onclose: () => unmount(component) },
    });
  }
</script>

<div class="bg-surface rounded-lg items-center p-4 flex flex-col relative gap-4">
  {#if auth.is_loading}
    <div class="relative flex gap-x-2 w-full justify-start">
      <div class="w-13 h-13 rounded-full bg-card animate-pulse"></div>
      <div class="space-y-2">
        <div class="bg-card h-[45%] rounded-lg w-40 animate-pulse"></div>
        <div class="bg-card h-[45%] rounded-lg w-25 animate-pulse"></div>
      </div>

      <!-- Position center -->
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Icon name="loading" class="animate-spin text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("loading")}</p>
      </div>
    </div>
  {:else if !is_logged_in}
    <div class="text-center space-y-0.5">
      <h2 class="text-2xl font-semibold">{t("you_are_not_logged_in")}</h2>
      <p class="text-sm text-muted">{t("please_log_in_profile")}</p>
    </div>

    <ButtonsSignIn {auth} />
  {:else if context.user}
    <button
      aria-label={t("sign_out")}
      type="button"
      class="relative h-13 flex justify-start w-full"
      onclick={() => (is_open = true)}
    >
      {#if context.user.avatar}
        <img
          src={context.user.avatar}
          alt={t("profile")}
          class="my-auto rounded-full absolute inset-0 z-1 size-13"
          referrerpolicy="no-referrer"
          onerror={(e) => {
            if (e.target instanceof HTMLElement) {
              e.target.style.display = "none";
            }
          }}
        />
        <Icon name="user" class="my-auto rounded-full absolute inset-0 z-0 size-13 border-2" />
      {/if}

      <div class="space-y-0.5 ml-17">
        <h2 class="text-left text-2xl font-semibold">
          {context.user.name}
        </h2>
        <p class="text-left text-sm font-medium text-muted">
          {context.user.email_address}
        </p>
      </div>
    </button>

    {#if is_relay_email}
      <div class="w-full space-y-1 border-t border-default pt-3">
        <p class="text-xs text-muted">{t("private_relay_email_hint")}</p>
        <button type="button" onclick={copyEmail} class="text-xs underline active:opacity-70">
          {t("copy_email_address")}
        </button>
      </div>
    {/if}
  {/if}
</div>

<Modal bind:is_open class="max-w-80! *:space-y-4" onclose={() => (is_open = false)}>
  <ModalHeader>{t("sign_out")}?</ModalHeader>
  <div class="grid grid-cols-2 gap-4 w-full justify-between items-center">
    <button
      type="button"
      class="flex items-center text-nowrap justify-center gap-1 py-1 px-3 h-12 bg-card rounded-lg"
      onclick={() => (is_open = false)}
    >
      <Icon name="xmark" size={16} class="shrink-0  mb-0.75" />
      <span class="font-medium leading-none">{t("no")}</span>
    </button>
    <button
      type="button"
      class="flex items-center text-nowrap justify-center gap-1 py-1 px-3 h-12 bg-secondary-500 rounded-lg text-alt"
      onclick={handleSignOut}
    >
      <Icon name="sign-out" size={16} class="shrink-0  mb-0.75" />
      <span class="font-medium leading-none">{t("sign_out")}</span>
    </button>
  </div>
  <button type="button" class="mx-auto block text-sm text-error underline active:opacity-70" onclick={openDeleteAccount}>
    {t("delete_account")}
  </button>
</Modal>
