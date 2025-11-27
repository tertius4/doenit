<script>
  /**
   * @typedef {Object} Props
   * @property {boolean} is_selected
   * @property {boolean} [round=false]
   * @property {() => void} onclick
   * @property {import("svelte").Snippet} children
   */

  /** @type {Props & Record<string, any>} */
  const { is_selected, round, onclick, children, ...rest } = $props();
</script>

<button
  type="button"
  aria-label="tag"
  {onclick}
  class={[
    {
      "py-1 gap-1 border text-nowrap flex items-center justify-center w-fit rounded-full": true,
      "bg-primary/20 border-primary text-alt": is_selected,
      "bg-card border-default": !is_selected,
      "px-3": !round,
      "px-2 aspect-square": round,
    },
    rest.class || "",
  ]}
>
  {@render children()}
</button>
