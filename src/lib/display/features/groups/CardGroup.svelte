<script>
  import ModalGroup from "$display/comps/modal/ModalGroup.svelte";
  import toast from "$display/toast/toast.svelte";
  import { fly, slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} name
   * @property {string} owner_user_id
   * @property {string} [description]
   * @property {string[]} [member_names]
   */

  /** @type {Props} */
  const { id, name, description, owner_user_id, member_names = [] } = $props();

  let is_editing = $state(false);

  async function deleteGroup() {
    const result = await Api.groups.delete(id);
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
      {#if description}
        <p class="text-sm text-muted truncate">{description}</p>
      {/if}
      {#if member_names.length > 0}
        <p class="text-xs text-muted truncate mt-0.5">{member_names.join(', ')}</p>
      {/if}
    </div>

    <button class="h-full text-error flex items-center justify-center" type="button" onclick={deleteGroup}>
      <Icon name="trash" class="w-5 h-5" />
    </button>
  </div>
</div>

<ModalGroup bind:open={is_editing} {id} {name} {description} {owner_user_id} />
