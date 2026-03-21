<script>
  import Icon from "$display/comps/Icon.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";

  import { t } from "$lib/services/language.svelte";

  const { ondelete, ...rest } = $props();

  let is_deleting = $state(false);
</script>

<button
  {...rest}
  type="button"
  class={["flex justify-center items-center", rest.class]}
  onclick={() => (is_deleting = true)}
  aria-label={t("close")}
>
  <Icon name="trash" size={24} class="text-error" />
</button>

<Modal bind:is_open={is_deleting} onclose={() => (is_deleting = false)} class="space-y-4">
  <ModalHeader>{t("delete_task")}</ModalHeader>
  <p>{t("delete_task_confirmation")}</p>
  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md" onclick={ondelete}>
    <Icon name="trash" class="h-full" />
    <span>{t("delete")}</span>
  </button>
</Modal>
