<script>
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";
  import { fly, slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import { alert } from "$lib/core/alert";
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

  let error_message = $state("");
  let is_editing = $state(false);

  async function deleteCategory() {
    error_message = "";

    const result = await Api.cats.delete(id);
    if (result.ok) return;

    alert.error("Failed to delete category", result.error);
  }
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg">
  <div class="grid {disabled ? 'grid-cols-1 px-4' : 'grid-cols-[48px_1fr_48px]'} items-center justify-between">
    <button
      type="button"
      class="h-full w-full flex justify-center items-center"
      onclick={() => (is_editing = true)}
      hidden={disabled}
    >
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Icon name="edit" class="w-5 h-5" />
      </div>
    </button>

    <div class="py-3 w-full text-lg font-semibold truncate flex gap-2">
      <span>{name}</span>
      <div class="h-fit bg-page rounded-full px-2 aspect-square flex items-center justify-center">
        <span class="text-muted font-light font-mono text-sm">{task_count}</span>
      </div>
    </div>

    <button class="h-full text-error flex items-center justify-center" onclick={deleteCategory} hidden={disabled}>
      <Icon name="trash" class="w-5 h-5" />
    </button>
  </div>
</div>

<ModalCategory bind:open={is_editing} category={{ id, name }} />
