<script>
  import { longpress } from "$logic/long-press";

  /**
   * @typedef {Object} Props
   * @property {boolean} [is_selected]
   * @property {boolean} [round=false]
   * @property {() => void} [onclick]
   * @property {import("svelte").Snippet} children
   */

  /** @type {Props & Record<string, any>} */
  const { is_selected = false, round = false, onlongpress, onclick = () => {}, children, ...rest } = $props();
</script>

<button
  type="button"
  aria-label="tag"
  {onlongpress}
  use:longpress
  {onclick}
  class={[
    {
      "py-1 gap-1 text-nowrap flex items-center justify-center w-fit": true,
      "bg-secondary-500 ring-secondary-600 ring-2 text-alt": is_selected,
      "bg-card ring-primary-500": !is_selected,
      "px-2 rounded-md": !round,
      "px-2 aspect-square rounded-full": round,
    },
    rest.class || "",
  ]}
>
  {@render children()}
</button>
