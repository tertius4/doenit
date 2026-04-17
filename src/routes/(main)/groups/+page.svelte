<script>
  import CardGroup from "$display/features/groups/CardGroup.svelte";
  import ModalGroup from "$display/comps/modal/ModalGroup.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { goto } from "$app/navigation";
  import View from "$display/view";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { onMount } from "svelte";

  /** @type {AL.GroupListItem[]} */
  let groups = $state([]);

  let show_create_modal = $state(false);

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  onMount(View.groups.getList(groups));
</script>

<div class="flex flex-col space-y-2 pt-2">
  {#each groups as group (group.id)}
    <CardGroup id={group.id} name={group.name} owner_user_id={group.owner_user_id} member_names={group.member_names} />
  {/each}
</div>

<!-- FAB -->
<button
  type="button"
  onclick={() => (show_create_modal = true)}
  class="fixed bottom-24 right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
  aria-label="Add group"
>
  <Icon name="users" size={28} class="text-white" />
</button>

<ModalGroup bind:open={show_create_modal} />
