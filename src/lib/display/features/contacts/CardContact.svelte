<script>
  import ModalContact from "$display/comps/modal/ModalContact.svelte";
  import toast from "$display/toast/toast.svelte";
  import { fly, slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} name
   * @property {string} email_address
   * @property {string} [avatar]
   */

  /** @type {Props} */
  const { id, name, email_address, avatar } = $props();

  let is_editing = $state(false);

  async function deleteContact() {
    const result = await Api.contacts.delete(id);
    if (!result.ok) toast.error(result.error);
  }
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg">
  <div class="grid grid-cols-[48px_1fr_48px] items-center justify-between">
    <button type="button" class="h-full w-full flex justify-center items-center" onclick={() => (is_editing = true)}>
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Icon name="edit" class="w-5 h-5" />
      </div>
    </button>

    <div class="py-3 w-full truncate">
      <p class="text-lg font-semibold truncate">{name}</p>
      <p class="text-sm text-muted truncate">{email_address}</p>
    </div>

    <button class="h-full text-error flex items-center justify-center" type="button" onclick={deleteContact}>
      <Icon name="trash" class="w-5 h-5" />
    </button>
  </div>
</div>

<ModalContact bind:open={is_editing} {id} {name} {email_address} {avatar} />
