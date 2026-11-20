<script>
  import Icon from "$display/comps/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} is_selected
   * @prop {string} label
   * @prop {() => void} onclick
   * @prop {string} [icon] - Shown after the label, e.g. "users" for a shared list.
   */

  /** @type {Props} */
  const { label, is_selected, onclick, icon } = $props();
</script>

<button
  type="button"
  role="radio"
  aria-checked={is_selected}
  {onclick}
  class={[
    "flex text-left border rounded-lg w-full p-2 outline-none gap-1 cursor-pointer focus-visible:ring-2 ring-primary",
    is_selected && "border-primary bg-primary/20 text-alt",
    !is_selected && "border-default bg-card hover:opacity-80",
  ]}
>
  <div
    class={[
      "my-auto flex items-center justify-center w-4 h-4 aspect-square rounded-full border",
      is_selected ? "border-primary" : "",
    ]}
  >
    {#if is_selected}
      <div class="w-2 h-2 bg-primary rounded-full m-auto"></div>
    {/if}
  </div>

  <div class="w-full p-1 flex items-center gap-2 min-w-0">
    <span class="truncate">{label}</span>
    {#if icon}<Icon name={icon} size={16} class="shrink-0 text-muted" />{/if}
  </div>
</button>
