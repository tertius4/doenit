<script>
  import Icon from "$display/comps/Icon.svelte";
  import ModalEditContact from "$display/comps/modal/ModalEditContact.svelte";
  import CardContact from "$display/features/contacts/CardContact.svelte";
  import CardInvite from "$display/features/contacts/CardInvite.svelte";
  import t from "$display/translate";
  import View from "$display/view";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

  /** @type {{ id: string; name: string | null } | null} */
  let editing_contact = $state(null);
  let show_edit_modal = $state(false);

  /** @type {AL.ContactListItem[]} */
  let contacts = $state([]);

  /** @type {AL.ContactInviteListItem[]} */
  let invites = $state([]);

  let other_invites_open = $state(false);

  const pending_invites = $derived(invites.filter((i) => i.status === "pending"));
  const other_invites = $derived(invites.filter((i) => i.status !== "pending" && i.status !== "cancelled"));

  onMount(View.contacts.getList(contacts));
  onMount(View.contacts.getInviteList(invites));
</script>

<div class="flex flex-col gap-4 pt-2 pb-24">
  {#if pending_invites.length > 0}
    <section class="flex flex-col gap-1">
      <p class="text-xs font-semibold uppercase text-muted px-1">{t("pending_invites")}</p>
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
      <p class="text-xs font-semibold uppercase text-muted px-1">{t("contacts")}</p>
      {#each contacts as contact (contact.id)}
        <CardContact
          id={contact.id}
          name={contact.name}
          email_address={contact.email_address}
          avatar_url={contact.avatar_url}
          onclick={() => {
            editing_contact = { id: contact.id, name: contact.name };
            show_edit_modal = true;
          }}
        />
      {/each}
    </section>
  {/if}

  {#if other_invites.length > 0}
    <section class="flex flex-col gap-1">
      <button
        type="button"
        class="text-xs flex font-semibold uppercase text-muted px-1 items-center w-full justify-between"
        onclick={() => (other_invites_open = !other_invites_open)}
      >
        <span>{t("invite_history")}</span>
        <Icon name="chevron-down" size={16} class="ml-1 {other_invites_open ? 'rotate-180' : ''}" />
      </button>

      {#if other_invites_open}
        <div transition:slide={{ axis: "y" }} class="flex flex-col gap-1">
          {#each other_invites as invite (invite.id)}
            <CardInvite
              id={invite.id}
              other_email={invite.other_email}
              status={invite.status}
              is_incoming={invite.is_incoming}
            />
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  {#if contacts.length === 0 && pending_invites.length === 0}
    <div class="flex flex-col items-center justify-center gap-3 pt-16 text-center">
      <Icon name="contacts" size={48} class="text-muted opacity-40" />
      <p class="text-muted text-sm">{t("no_contacts_yet")}</p>
    </div>
  {/if}
</div>

{#if editing_contact}
  <ModalEditContact bind:open={show_edit_modal} contact_id={editing_contact.id} initial_name={editing_contact.name} />
{/if}
