<script>
  import { backHandler, navHistory } from "$logic/navigation";
  import { context } from "$logic/context.svelte";
  import { createAuthFlow } from "$display/auth.svelte";
  import ButtonsSignIn from "$display/comps/button/ButtonsSignIn.svelte";
  import Contacts from "./comps/Contacts.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { wait } from "$lib";
  import t from "$display/translate";
  import { onMount } from "svelte";
  import ModalSendInvite from "$display/comps/modal/ModalSendInvite.svelte";

  let show_invite_modal = $state(false);
  const auth = createAuthFlow();

  const is_logged_in = $derived(!!context.user?.id);

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });
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

  <ButtonsSignIn {auth} class="mt-4" />
{/if}
