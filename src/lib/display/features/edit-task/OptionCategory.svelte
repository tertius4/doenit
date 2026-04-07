<script>
  /**
   * @typedef {Object} Props
   * @prop {boolean} is_selected
   * @prop {string} label
   * @prop {() => void} onclick
   */

  /** @type {Props} */
  const { label, is_selected, onclick } = $props();
</script>

<button
  type="button"
  {onclick}
  class={[
    "flex text-left border rounded-lg border-primary w-full p-2 outline-none gap-1 cursor-pointer",
    is_selected && "bg-primary/20 text-alt ",
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

  <div class={["w-full p-1", !is_selected && "border-default"]}>
    <span>{label}</span>
  </div>
</button>
