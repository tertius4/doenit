<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import OptionCategory from "./OptionCategory.svelte";
  import View from "$display/view";
  import { onMount } from "svelte";
  import { wait } from "$lib";

  /**
   * @typedef {Object} Props
   * @property {string | null | undefined} value - The group (scope) id the task is assigned to.
   */

  /** @type {Props & Record<string, any>} */
  let { value = $bindable(undefined) } = $props();

  // A task that already belongs to a group stays there: it can't be unassigned or moved.
  // svelte-ignore state_referenced_locally
  const is_locked = !!value;

  /** @type {AL.GroupListItem[]} */
  const groups = $state([]);
  onMount(View.groups.getList(groups));

  let is_open = $state(false);

  const selected_group = $derived(groups.find((g) => g.id === value) ?? null);

  /**
   * @param {string} id
   */
  async function selectGroup(id) {
    value = id;
    await wait(200);
    is_open = false;
  }
</script>

{#if is_locked || groups.length > 0}
  <div>
    <label class="font-semibold" for="group">{t("group")}</label>
    <div class="relative">
      <button
        type="button"
        id="group"
        disabled={is_locked}
        class={[
          "text-left bg-card h-12 p-2 w-full border border-default rounded-lg appearance-none outline-none focus:ring ring-primary pr-6 truncate",
          !selected_group && "text-muted",
        ]}
        onclick={() => (is_open = true)}
      >
        <span>{selected_group?.name ?? (is_locked ? "" : t("no_group"))}</span>
      </button>

      {#if selected_group && !is_locked}
        <ButtonClear onclick={() => (value = undefined)} class="absolute right-0 top-0 bottom-0" />
      {:else if !is_locked}
        <div
          class="aspect-square h-12 flex items-center justify-center absolute right-0 top-0 bottom-0 pointer-events-none"
        >
          <Icon name="chevron-down" class="pointer-events-none {is_open ? '-rotate-180' : ''}" />
        </div>
      {/if}
    </div>
  </div>

  {#if !is_locked}
    <Modal bind:is_open class="*:space-y-4">
      <ModalHeader>{t("choose_group")}</ModalHeader>
      <div class="space-y-1">
        {#each groups as group (group.id)}
          <OptionCategory is_selected={group.id === value} label={group.name} onclick={() => selectGroup(group.id)} />
        {/each}
      </div>
    </Modal>
  {/if}
{/if}
