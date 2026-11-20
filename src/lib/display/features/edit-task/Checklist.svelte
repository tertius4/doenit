<script>
  import Icon from "$display/comps/Icon.svelte";
  import InputCheckbox from "$display/comps/input/InputCheckbox.svelte";
  import t from "$display/translate";
  import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_TEXT } from "$logic/checklist";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  /**
   * The items of a task: add with Enter, tick off, edit, delete and move up or down.
   *
   * @typedef {Object} Props
   * @prop {Domain.ChecklistItem[]} [items]
   * @prop {(item_id: string) => *} [ontoggle] - Also called when an item is ticked, e.g. to save it straight away.
   */

  /** @type {Props} */
  let { items = $bindable([]), ontoggle } = $props();

  let new_text = $state("");
  const done_count = $derived(items.filter((item) => item.done).length);
  const is_full = $derived(items.length >= MAX_CHECKLIST_ITEMS);

  function add() {
    const text = new_text.trim();
    if (!text || is_full) return;
    items = [...items, { id: crypto.randomUUID(), text, done: false }];
    new_text = "";
  }

  /** @param {string} id */
  function toggle(id) {
    items = items.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    ontoggle?.(id);
  }

  /** @param {string} id @param {string} text */
  function edit(id, text) {
    items = items.map((item) => (item.id === id ? { ...item, text } : item));
  }

  /** @param {string} id */
  function remove(id) {
    items = items.filter((item) => item.id !== id);
  }

  /** @param {number} index @param {-1 | 1} step */
  function move(index, step) {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    items = next;
  }
</script>

<div class="space-y-1">
  <div class="flex items-center justify-between">
    <span class="font-semibold">{t("checklist")}</span>
    {#if items.length}
      <span class="text-sm text-muted font-mono">{done_count}/{items.length}</span>
    {/if}
  </div>

  {#each items as item, index (item.id)}
    <div
      class="flex items-center gap-2 bg-card border border-default rounded-lg pl-2 pr-1 h-11"
      animate:flip={{ duration: 200 }}
      transition:slide
    >
      <InputCheckbox checked={item.done} onchange={() => toggle(item.id)} />
      <input
        type="text"
        value={item.text}
        maxlength={MAX_CHECKLIST_TEXT}
        aria-label={t("checklist_item")}
        oninput={(e) => edit(item.id, e.currentTarget.value)}
        onkeydown={(e) => e.key === "Enter" && e.preventDefault()}
        class={["flex-1 min-w-0 bg-transparent outline-none", item.done && "line-through text-muted"]}
      />
      <button
        type="button"
        class="p-1 disabled:opacity-30"
        disabled={index === 0}
        aria-label={t("move_up")}
        onclick={() => move(index, -1)}
      >
        <Icon name="chevron-down" size={16} class="rotate-180" />
      </button>
      <button
        type="button"
        class="p-1 disabled:opacity-30"
        disabled={index === items.length - 1}
        aria-label={t("move_down")}
        onclick={() => move(index, 1)}
      >
        <Icon name="chevron-down" size={16} />
      </button>
      <button type="button" class="p-1" aria-label={t("delete")} onclick={() => remove(item.id)}>
        <Icon name="xmark" size={16} class="text-error" />
      </button>
    </div>
  {/each}

  {#if !is_full}
    <div class="flex items-center gap-2 border border-dashed border-default rounded-lg pl-3 pr-1 h-11">
      <Icon name="plus" size={16} class="text-muted shrink-0" />
      <input
        type="text"
        bind:value={new_text}
        maxlength={MAX_CHECKLIST_TEXT}
        placeholder={t("add_checklist_item")}
        aria-label={t("add_checklist_item")}
        enterkeyhint="enter"
        onkeydown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          add();
        }}
        onblur={add}
        class="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted"
      />
    </div>
  {/if}
</div>
