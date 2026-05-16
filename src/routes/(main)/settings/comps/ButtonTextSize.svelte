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
    {
      "flex items-center justify-center gap-2 h-12 p-1 ring transition-all duration-300 rounded-lg": true,
      "bg-secondary-500 ring-secondary-600 ring-3 text-alt": selected,
      "bg-card ring-primary-500": !selected,
    },
    rest.class || "",
  ]}
>
  {@render children()}
</button>
