<script>
  /**
   * Toggle component for a switch-like button.
   * @typedef {Object} Props
   * @prop {boolean} value - The current state of the toggle (on/off).
   * @prop {(value: boolean) => void} onchange - Callback function to call when the toggle state changes.
   */

  /** @type {Props} */
  const { value, onchange, ...rest } = $props();

  function handleClick() {
    onchange(!value);
  }
</script>

<button
  {...rest}
  type="button"
  class="relative w-14 h-8 rounded-full transition-colors {value ? 'bg-primary' : 'bg-card'}"
  onclick={handleClick}
>
  <div
    class={[
      "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
      value ? "translate-x-7" : "translate-x-1",
    ]}
  ></div>
</button>
