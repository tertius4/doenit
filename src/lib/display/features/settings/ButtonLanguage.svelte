<script>
  /**
   * @typedef {Object} Props
   * @prop {boolean} [selected]
   * @prop {string} flag_src
   * @prop {string} language_name
   * @prop {(event: MouseEvent) => void} onclick
   */
  
  /** @type {Props & Record<string, any>} */
  const { selected = false, flag_src, language_name, onclick, ...rest } = $props();
</script>

<button
  class={[
    {
      "flex items-center gap-2 h-12 p-1 ring transition-all duration-300 rounded-lg": true,
      "bg-secondary-500 ring-secondary-600 ring-3 text-alt": selected,
      "bg-card ring-primary-500": !selected,
    },
    rest.class || "",
  ]}
  aria-pressed={selected}
  {onclick}
>
  <img src={flag_src} alt="{language_name} flag" class="w-fit h-full object-cover rounded-sm" />
  <span
    class={{
      "text-sm": true,
      "font-semibold": selected,
      "font-medium": !selected,
    }}
  >
    {language_name}
  </span>
</button>
