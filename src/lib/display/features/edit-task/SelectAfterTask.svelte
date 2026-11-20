<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import OptionList from "./OptionList.svelte";
  import View from "$display/view";
  import { wait } from "$lib";

  /**
   * "After task": the task in the same list this one waits on. Only tasks that would not close a circle are offered.
   *
   * @typedef {Object} Props
   * @prop {string | null | undefined} value - The task it waits on (after_task_id).
   * @prop {string | null | undefined} list_id - The task's list (null: the Inbox).
   * @prop {string} [task_id] - Undefined for a new task.
   * @prop {string | null} [date] - The task's own date, to warn when it is before the task it waits on.
   */

  /** @type {Props} */
  let { value = $bindable(null), list_id, task_id, date = null } = $props();

  /** @type {{ id: string, name: string, date: string | null, is_done: boolean }[]} */
  const options = $state([]);
  let is_open = $state(false);

  $effect(() => View.lists.afterOptions(list_id ?? null, task_id, options));

  const selected = $derived(options.find((option) => option.id === value));
  const is_early = $derived(!!date && !!selected?.date && date.slice(0, 10) < selected.date.slice(0, 10));

  /** @param {string | null} id */
  async function select(id) {
    value = id;
    await wait(200); // Let the click animation finish
    is_open = false;
  }
</script>

{#if options.length || value}
  <div>
    <label class="font-semibold" for="after_task">{t("after_task")}</label>
    <div class="border border-default h-12 bg-card rounded-lg w-full flex">
      <button
        type="button"
        id="after_task"
        class="w-full flex items-center gap-2 p-2 text-left min-w-0"
        onclick={() => (is_open = true)}
      >
        <Icon name="lock" size={18} class="shrink-0 text-muted" />
        <span class={["truncate", !selected && "text-muted"]}>{selected?.name ?? t("after_task_none")}</span>
      </button>
      {#if value}
        <ButtonClear onclick={() => (value = null)} />
      {/if}
    </div>
    {#if is_early}
      <p class="text-sm text-warning mt-1">{t("after_task_early")}</p>
    {/if}
  </div>
{/if}

<Modal bind:is_open class="*:space-y-4">
  <ModalHeader>{t("after_task")}</ModalHeader>
  <p class="text-sm text-muted">{t("after_task_hint")}</p>

  <div class="space-y-1" role="radiogroup" aria-label={t("after_task")}>
    <OptionList is_selected={!value} label={t("after_task_none")} onclick={() => select(null)} />
    {#each options as option (option.id)}
      <OptionList
        is_selected={option.id === value}
        label={option.name}
        icon={option.is_done ? "check" : undefined}
        onclick={() => select(option.id)}
      />
    {/each}
  </div>
</Modal>
