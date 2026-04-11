<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";

  /**
   * A text input component that updates the bound value after a debounce time.
   * @typedef {Object} Props
   * @prop {string} value The value of the input.
   * @prop {boolean} [focus_on_mount=false] Whether to focus the input when it is mounted.
   * @prop {number} [debounce=0] The debounce time in milliseconds before updating the bound value.
   * @prop {boolean} [can_clear=false] Whether to show a clear button when there is a value.
   * @prop {(value: string) => void} onchange The event handler for the change event.
   */

  /** @type {Props & Record<string, any>} */
  const { value, focus_on_mount = false, debounce = 0, can_clear = false, onchange, ...rest } = $props();

  /** @type {NodeJS.Timeout | null} */
  let timeout = null;

  function clearValue() {
    if (onchange) onchange("");
  }

  /**
   * Focus the input element when it is mounted.
   * @param {HTMLElement} node
   */
  function init(node) {
    if (!focus_on_mount) return;

    setTimeout(() => node.focus(), 100);
  }

  /**
   *
   * @param {Event} event
   */
  function handleChange(event) {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      if (onchange) onchange(target.value);
    }, debounce);
  }
</script>

<div class="relative w-full">
  <input
    {...rest}
    use:init
    type="text"
    {value}
    onchange={handleChange}
    class={[
      "bg-card border border-default p-2 h-12 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary",
      rest.class ?? "",
    ]}
  />

  {#if can_clear && value}
    <ButtonClear onclick={clearValue} class="absolute right-0 top-0 bottom-0" />
  {/if}
</div>
