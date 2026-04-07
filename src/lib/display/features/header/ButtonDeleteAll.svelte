<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";
  import { Selected } from "$lib/selected.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { onNavigate } from "$app/navigation";
  import { fade } from "svelte/transition";
  import { alert } from "$lib/core/alert";
  import Api from "$logic/api";

  let is_deleting = $state(false);

  onNavigate(() => {
    Selected.tasks.clear();
  });

  async function deleteAll() {
    const ids = [...Selected.tasks.values()];
    Selected.tasks.clear();

    const result = await Api.task.deleteAll({ ids });
    if (!result.ok) alert.error(result.error);

    is_deleting = false;
  }
</script>

<div class="flex justify-center items-center aspect-square w-12">
  {#if Selected.tasks.size}
    <button
      transition:fade
      aria-label={t("delete_tasks")}
      class="aspect-square bg-error text-alt rounded-md flex justify-center items-center"
      onclick={() => (is_deleting = true)}
      type="button"
    >
      <Icon name="trash" size={28} />
    </button>
  {/if}
</div>

<Modal bind:is_open={is_deleting} onclose={() => (is_deleting = false)} class="space-y-4" onsubmit={deleteAll}>
  <ModalHeader>{t("delete")}</ModalHeader>
  <p>
    {Selected.tasks.size > 1 ? t("delete_confirmation_multiple") : t("delete_confirmation_single")}
  </p>

  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md">
    <Icon name="trash" size={28} class="h-full" />
    <span>{t("delete")}</span>
  </button>
</Modal>
