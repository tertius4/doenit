<script>
  import ModalList from "$display/comps/modal/ModalList.svelte";
  import { backHandler, navHistory } from "$logic/navigation";
  import Icon from "$display/comps/Icon.svelte";
  import { goto } from "$app/navigation";
  import Lists from "./comps/Lists.svelte";
  import { onMount } from "svelte";
  import t from "$display/translate";

  let show_create_modal = $state(false);

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });
</script>

<Lists />

<!-- FAB -->
<button
  type="button"
  onclick={() => (show_create_modal = true)}
  class="fixed right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full bg-primary shadow-lg"
  style="bottom: calc(89px + env(safe-area-inset-bottom)); "
  aria-label={t("new_list")}
>
  <Icon name="plus" size={28} class="text-white" />
</button>

<ModalList bind:open={show_create_modal} onsubmit={(id) => goto(`/lists/${id}`)} />
