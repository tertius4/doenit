<script>
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import ModalList from "$display/comps/modal/ModalList.svelte";
  import OptionList from "$display/features/edit-task/OptionList.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import { INBOX_ID, wait } from "$lib";
  import View from "$display/view";
  import { onMount } from "svelte";
  import Api from "$logic/api";

  /**
   * Moves the selected tasks to a list (or the Inbox).
   *
   * @typedef {Object} Props
   * @property {() => void} onclose
   */

  /** @type {Props & Record<string, any>} */
  const { onclose, ...rest } = $props();

  let is_open = $state(false);
  let is_adding = $state(false);
  /** @type {string | undefined} */
  let chosen_id = $state(undefined);
  /** @type {AL.ListOption[]} */
  let options = $state([]);

  onMount(View.lists.options(options));

  /** @param {string} id */
  async function moveTo(id) {
    chosen_id = id;

    // At least 200ms, so the choice shows before the modal closes.
    const [result] = await Promise.all([Api.lists.moveTasks(id === INBOX_ID ? null : id, [...selected_tasks]), wait(200)]);
    if (!result.ok) toast.error(result.error);
    else selected_tasks.clear();

    chosen_id = undefined;
    is_open = false;
    onclose();
  }
</script>

<button
  {...rest}
  type="button"
  aria-label={t("move_to_list")}
  onclick={() => (is_open = true)}
  class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
>
  <Icon name="categories" size={16} />
  <span>{t("move_to_list")}</span>
</button>

<Modal bind:is_open class="*:space-y-4">
  <ModalHeader>{t("move_to_list")}</ModalHeader>

  <div class="space-y-1" role="radiogroup" aria-label={t("move_to_list")}>
    {#each options as option (option.id)}
      <OptionList
        is_selected={option.id === chosen_id}
        label={option.name}
        icon={option.is_shared ? "users" : undefined}
        onclick={() => moveTo(option.id)}
      />
    {/each}
  </div>

  <button
    type="button"
    class="w-full mt-1 h-12 bg-card border border-default rounded-md flex items-center justify-center gap-2"
    onclick={() => {
      is_adding = true;
      is_open = false;
    }}
  >
    <Icon name="plus" />
    <span class="block font-medium my-2">{t("new_list")}</span>
  </button>
</Modal>

<ModalList bind:open={is_adding} onsubmit={(id) => moveTo(id)} onclose={onclose} />
