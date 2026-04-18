<script>
  import CardContact from "$display/features/contacts/CardContact.svelte";
  import ModalContact from "$display/comps/modal/ModalContact.svelte";
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

  let show_create_modal = $state(false);
  let is_loading = $state(false);

  const is_logged_in = $derived(!!context.user?.id);

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(View.contacts.getList(contacts));

  async function handleSignIn() {
    is_loading = true;
    const result = await Api.auth.signIn();
    is_loading = false;

    if (!result.ok) {
      if (result.error === "USER_CANCELED") {
        return;
      }

      toast.error("Inteken fout", result.error || t("something_went_wrong"));
    }
  }
</script>

{#if is_logged_in}
  <div class="flex flex-col space-y-2 pt-2">
    {#each contacts as contact (contact.id)}
      <CardContact id={contact.id} name={contact.name} email_address={contact.email_address} avatar={contact.avatar} />
    {/each}
  </div>

  <!-- FAB -->
  <button
    type="button"
    onclick={() => (show_create_modal = true)}
    class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
    style="bottom: calc(80px + env(safe-area-inset-bottom)); "
    aria-label="Add contact"
  >
    <Icon name="user-plus" size={28} class="text-white" />
  </button>

  <ModalContact bind:open={show_create_modal} />
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
