<script>
  /**
   * Segmented control to pick one of a few options.
   * @typedef {Object} Props
   * @prop {{ value: string, label: string }[]} options - The options to choose from.
   * @prop {string} value - The value of the selected option.
   * @prop {(value: string) => void} onchange - Called with the value of the option that was picked.
   */

  /** @type {Props & Record<string, any>} */
  const { options, value, onchange, ...rest } = $props();
</script>

<div {...rest} class={["flex w-full gap-1 rounded-full bg-card p-1", rest.class]} role="radiogroup">
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={option.value === value}
      class={[
        "h-10 flex-1 rounded-full px-4 font-medium transition-colors",
        option.value === value ? "bg-primary text-alt" : "",
      ]}
      onclick={() => option.value !== value && onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
