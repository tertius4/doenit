<script>
  /**
   * @typedef {Object} Props
   * @prop {() => void} onclick
   * @prop {boolean} selected
   * @prop {import("svelte").Snippet} children
   */

  /** @type {Props & Record<string, any>} */
  const { onclick, children, selected, ...rest } = $props();
</script>

<button
  {...rest}
  type="button"
  aria-label="Text size button"
  {onclick}
  class={[
    "w-full border h-12 px-4 py-2 rounded-lg flex items-center justify-center gap-2",
    selected && "bg-primary/40 border-primary",
    !selected && "bg-card",
    rest.class || "",
  ]}
>
  {@render children()}
</button>
