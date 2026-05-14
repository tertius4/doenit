<script>
  import CardContact from "$display/features/contacts/CardContact.svelte";
  import CardInvite from "$display/features/contacts/CardInvite.svelte";
  import ModalSendInvite from "$display/comps/modal/ModalSendInvite.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { goto } from "$app/navigation";
  import View from "$display/view";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { context } from "$logic/context.svelte";
  import t from "$display/translate";
  import { onMount } from "svelte";
  import toast from "$display/toast/toast.svelte";
  import Api from "$logic/api";

  /** @type {AL.ContactListItem[]} */
  let contacts = $state([]);

  /** @type {AL.ContactInviteListItem[]} */
  let invites = $state([]);

  let show_invite_modal = $state(false);
  let is_loading = $state(false);

  const is_logged_in = $derived(!!context.user?.id);

  const pending_invites = $derived(invites.filter((i) => i.status === "pending"));
  const other_invites = $derived(invites.filter((i) => i.status !== "pending" && i.status !== "cancelled"));

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(View.contacts.getList(contacts));
  onMount(View.contacts.getInviteList(invites));

  onMount(() => {
    if (context.user?.id) Api.invites.pull();
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
  <div class="flex flex-col gap-4 pt-2 pb-24">
    {#if pending_invites.length > 0}
      <section class="flex flex-col gap-1">
        <p class="text-xs font-semibold uppercase text-muted px-1">Pending Invites</p>
        {#each pending_invites as invite (invite.id)}
          <CardInvite
            id={invite.id}
            other_email={invite.other_email}
            status={invite.status}
            is_incoming={invite.is_incoming}
          />
        {/each}
      </section>
    {/if}

    {#if contacts.length > 0}
      <section class="flex flex-col gap-1">
        <p class="text-xs font-semibold uppercase text-muted px-1">Contacts</p>
        {#each contacts as contact (contact.id)}
          <CardContact
            id={contact.id}
            firebase_uid={contact.firebase_uid}
            name={contact.name}
            email_address={contact.email_address}
            avatar_url={contact.avatar_url}
          />
        {/each}
      </section>
    {/if}

    {#if other_invites.length > 0}
      <section class="flex flex-col gap-1">
        <p class="text-xs font-semibold uppercase text-muted px-1">Invite History</p>
        {#each other_invites as invite (invite.id)}
          <CardInvite
            id={invite.id}
            other_email={invite.other_email}
            status={invite.status}
            is_incoming={invite.is_incoming}
          />
        {/each}
      </section>
    {/if}

    {#if contacts.length === 0 && pending_invites.length === 0}
      <div class="flex flex-col items-center justify-center gap-3 pt-16 text-center">
        <Icon name="contacts" size={48} class="text-muted opacity-40" />
        <p class="text-muted text-sm">No contacts yet. Send an invite to get started.</p>
      </div>
    {/if}
  </div>

  <!-- FAB -->
  <button
    type="button"
    onclick={() => (show_invite_modal = true)}
    class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
    style="bottom: calc(80px + env(safe-area-inset-bottom));"
    aria-label="Send invite"
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
