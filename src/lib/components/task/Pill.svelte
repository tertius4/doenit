<script>
  /**
   * @typedef {Object} Props
   * @property {boolean} is_past
   * @property {boolean} is_ongoing
   * @property {boolean} is_selected
   */

  /** @type {Props & Record<string, any>} */
  const { is_past, is_ongoing, is_selected, children, ...rest } = $props();
</script>

<div
  class={[
    {
      "text-left px-1 w-fit max-w-full flex items-center h-fit gap-1 opacity-80": true,
      "bg-surface": !is_past && !is_ongoing && !is_selected,
      "bg-error/80": is_past && !is_selected && !is_ongoing,
      "bg-success/80": is_ongoing && !is_selected,
      "bg-primary": is_selected,
    },
    rest.class || "",
  ]}
>
  {@render children?.()}
</div>
