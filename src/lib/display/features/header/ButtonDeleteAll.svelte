<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import { selected_tasks } from "$display/selected.svelte";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { onNavigate } from "$app/navigation";
  import { fade } from "svelte/transition";
  import t from "$display/translate";
  import Api from "$logic/api";

  let is_deleting = $state(false);

  onNavigate(() => {
    selected_tasks.clear();
  });

  async function deleteAll() {
    const result = await Api.task.deleteAll({
      ids: [...selected_tasks.values()],
    });
    if (!result.ok) toast.error(result.error);

    selected_tasks.clear();
    is_deleting = false;
  }
</script>

<div class="flex justify-center items-center aspect-square w-12">
  {#if selected_tasks.size}
    <button
      transition:fade
      aria-label={t("delete_tasks")}
      class="aspect-square bg-error text-alt rounded-md flex justify-center items-center p-1.5"
      onclick={() => (is_deleting = true)}
      type="button"
    >
      <Icon name="trash" size={28} class="pointer-events-none h-full aspect-square" />
    </button>
  {/if}
</div>

<Modal bind:is_open={is_deleting} onclose={() => (is_deleting = false)} class="space-y-4" onsubmit={deleteAll}>
  <ModalHeader>{t("delete")}</ModalHeader>
  <p>
    {selected_tasks.size > 1 ? t("delete_confirmation_multiple") : t("delete_confirmation_single")}
  </p>

  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md">
    <Icon name="trash" size={28} class="h-full" />
    <span>{t("delete")}</span>
  </button>
</Modal>
