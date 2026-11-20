<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import ModalList from "$display/comps/modal/ModalList.svelte";
  import OptionList from "./OptionList.svelte";
  import View from "$display/view";
  import { onMount } from "svelte";
  import { INBOX_ID, wait } from "$lib";

  /**
   * The list a task goes in. The Inbox is `null`.
   *
   * @typedef {Object} Props
   * @property {string | null | undefined} list_id
   * @property {string | null | undefined} [scope_id] - The chosen list's scope: its id when it is shared, else null.
   */

  /** @type {Props} */
  let { list_id = $bindable(null), scope_id = $bindable(null) } = $props();

  /** @type {AL.ListOption[]} */
  const options = $state([]);
  onMount(View.lists.options(options));

  let is_open = $state(false);
  let is_adding = $state(false);

  const selected_id = $derived(list_id || INBOX_ID);
  const selected = $derived(options.find((o) => o.id === selected_id));

  // The form starts with only a list id (e.g. from a list's page): take its scope once the lists are known.
  $effect(() => {
    if (selected) scope_id = selected.is_shared ? selected.id : null;
  });

  /**
   * @param {string} id
   * @param {boolean} is_shared
   */
  async function select(id, is_shared) {
    list_id = id === INBOX_ID ? null : id;
    scope_id = is_shared ? id : null;

    await wait(200); // Let the click animation finish
    is_open = false;
  }
</script>

<div>
  <label class="font-semibold" for="list">{t("list")}</label>
  <div class="relative">
    <button
      type="button"
      id="list"
      class="text-left bg-card h-12 p-2 w-full border border-default rounded-lg appearance-none outline-none focus:ring ring-primary pr-12 flex items-center gap-2"
      onclick={() => (is_open = true)}
    >
      <Icon name={selected?.is_shared ? "users" : "categories"} size={18} class="shrink-0 text-muted" />
      <span class="truncate">{selected?.name ?? t("inbox")}</span>
    </button>

    <div class="aspect-square h-12 flex items-center justify-center absolute right-0 top-0 bottom-0 pointer-events-none">
      <Icon name="chevron-down" class="pointer-events-none {is_open ? '-rotate-180' : ''}" />
    </div>
  </div>
</div>

<Modal bind:is_open class="*:space-y-4">
  <ModalHeader>{t("choose_list")}</ModalHeader>

  <div class="space-y-1" role="radiogroup" aria-label={t("choose_list")}>
    {#each options as option (option.id)}
      <OptionList
        is_selected={option.id === selected_id}
        label={option.name}
        icon={option.is_shared ? "users" : undefined}
        onclick={() => select(option.id, option.is_shared)}
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
    <Icon name="plus" size={20} />
    <span class="block font-medium my-2">{t("new_list")}</span>
  </button>
</Modal>

<ModalList bind:open={is_adding} onsubmit={(id) => select(id, false)} />
