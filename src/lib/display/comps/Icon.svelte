<script>
  /**
   * Renders an icon from the shared sprite at static/icons.svg.
   *
   * @typedef {Object} Props
   * @property {string} name - The id of the sprite symbol to display.
   * @property {string | Record<string, boolean>} [class] - Additional CSS classes to apply to the icon.
   * @property {string} [style] - Additional inline styles to apply to the icon.
   * @property {number} [size=28] - The size of the icon in pixels.
   * @property {string} [title] - Accessible label. When omitted the icon is decorative and hidden from screen readers.
   */

  /** @type {Props & Record<string, any>} */
  const { name, class: className = "", size = 28, title, ...rest } = $props();
</script>

<svg
  viewBox="0 0 {size} {size}"
  width={size}
  height={size}
  class={className}
  role={title ? "img" : undefined}
  aria-hidden={title ? undefined : "true"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <use href="/icons.svg#{name}" />
</svg>
