<script>
  import CardContact from "$display/features/contacts/CardContact.svelte";
  import ModalContact from "$display/comps/modal/ModalContact.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { goto } from "$app/navigation";
  import View from "$display/view";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { onMount } from "svelte";

  /** @type {AL.ContactListItem[]} */
  let contacts = $state([]);

  let show_create_modal = $state(false);

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(View.contacts.getList(contacts));
</script>

<div class="flex flex-col space-y-2 pt-2">
  {#each contacts as contact (contact.id)}
    <CardContact
      id={contact.id}
      name={contact.name}
      email_address={contact.email_address}
      avatar={contact.avatar}
    />
  {/each}
</div>

<!-- FAB -->
<button
  type="button"
  onclick={() => (show_create_modal = true)}
  class="fixed bottom-24 right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
  aria-label="Add contact"
>
  <Icon name="user-plus" size={28} class="text-white" />
</button>

<ModalContact bind:open={show_create_modal} />

