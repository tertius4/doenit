<script>
  import ModalGroup from "$display/comps/modal/ModalGroup.svelte";
  import { backHandler, navHistory } from "$logic/navigation";
  import { context } from "$logic/context.svelte";
  import { createAuthFlow } from "$display/auth.svelte";
  import ButtonsSignIn from "$display/comps/button/ButtonsSignIn.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { wait } from "$lib";
  import { goto } from "$app/navigation";
  import Groups from "./comps/Groups.svelte";
  import { onMount } from "svelte";
  import t from "$display/translate";

  let show_create_modal = $state(false);
  const auth = createAuthFlow();

  const is_logged_in = $derived(!!context.user?.id);

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });
</script>

{#if is_logged_in}
  {#await wait(300)}
    <div class="flex justify-center items-center h-20">
      <Icon name="loading" size={32} class="animate-spin text-muted" />
    </div>
  {:then}
    <Groups />
  {/await}

  <!-- FAB -->
  <button
    type="button"
    onclick={() => (show_create_modal = true)}
    class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
    style="bottom: calc(89px + env(safe-area-inset-bottom)); "
    aria-label={t("add_group")}
  >
    <Icon name="new-group" size={28} class="text-white" />
  </button>

  <ModalGroup bind:open={show_create_modal} onsubmit={(id) => goto(`/groups/${id}`)} />
{:else}
  <div class="flex flex-col items-center justify-center gap-4 pt-16 text-center">
    <Icon name="user" size={48} class="text-muted opacity-40" />
    <p class="text-muted">{t("log_in_to_see_groups")}</p>
  </div>

  <ButtonsSignIn {auth} class="mt-4" />
{/if}
