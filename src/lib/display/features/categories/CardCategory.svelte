<script>
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} name
   * @property {boolean} [disabled]
   * @property {number} task_count
   */

  /** @type {Props} */
  const { id, name, task_count, disabled = false } = $props();

  let is_editing = $state(false);

  async function deleteCategory() {
    const result = await Api.cats.delete(id);
    if (result.ok) return;

    toast.error(t("failed_to_delete_category"), result.error);
  }

  function handleEdit() {
    if (disabled) return;

    is_editing = true;
  }
</script>

<div class="bg-surface rounded-lg">
  <div
    class="grid {disabled ? 'grid-cols-[minmax(0,1fr)] px-4' : 'grid-cols-[48px_minmax(0,1fr)_48px]'} items-center justify-between"
  >
    <button type="button" class="h-full w-full flex justify-center items-center" onclick={handleEdit} hidden={disabled}>
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Icon name="edit" class="w-5 h-5" />
      </div>
    </button>

    <div class="py-3 w-full min-w-0 text-lg font-semibold flex gap-2">
      <span class="truncate">{name}</span>
      <div class="h-fit shrink-0 bg-page rounded-full px-2 aspect-square flex items-center justify-center">
        <span class="text-muted font-light font-mono text-sm">{task_count}</span>
      </div>
    </div>

    <button class="h-full text-error flex items-center justify-center" onclick={deleteCategory} hidden={disabled}>
      <Icon name="trash" class="w-5 h-5" />
    </button>
  </div>
</div>

<ModalCategory bind:open={is_editing} {id} {name} />
