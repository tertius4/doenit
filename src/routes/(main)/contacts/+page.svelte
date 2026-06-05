<script>
  import { backHandler } from "$logic/navigation";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import Contacts from "./comps/Contacts.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { BACK_BUTTON_FUNCTION, wait } from "$lib";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import { onMount } from "svelte";
  import Api from "$logic/api";
  import ModalSendInvite from "$display/comps/modal/ModalSendInvite.svelte";

  let show_invite_modal = $state(false);
  let is_loading = $state(false);

  const is_logged_in = $derived(!!context.user?.id);

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  async function handleSignIn() {
    is_loading = true;
    const result = await Api.auth.signIn();
    is_loading = false;

    if (!result.ok) {
      if (result.error === "USER_CANCELED") return;
      toast.error("Inteken fout", result.error || t("something_went_wrong"));
    }
  }
</script>

{#if is_logged_in}
  <!-- TODO: MIght be able to make this a tick() -->
  {#await wait(300)}
    <div class="flex justify-center items-center h-20">
      <Icon name="loading" size={32} class="animate-spin text-muted" />
    </div>
  {:then}
    <Contacts />
  {/await}

  <!-- FAB -->
  <button
    type="button"
    onclick={() => (show_invite_modal = true)}
    class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
    style="bottom: calc(89px + env(safe-area-inset-bottom));"
    aria-label={t("send_invite")}
  >
    <Icon name="user-plus" size={28} class="text-white" />
  </button>

  <ModalSendInvite bind:open={show_invite_modal} />
{:else}
  <div class="flex flex-col items-center justify-center gap-4 pt-16 text-center">
    <Icon name="user" size={48} class="text-muted opacity-40" />
    <p class="text-muted">{t("log_in_to_see_contacts")}</p>
  </div>

  <button
    type="button"
    onclick={handleSignIn}
    class="bg-card border border-default flex gap-1 items-center px-6 py-3 rounded-md ml-auto mx-auto mt-4"
  >
    <Icon name="google" size={20} />
    <span class="font-medium">{t("log_in_with_google")}</span>
  </button>
{/if}
