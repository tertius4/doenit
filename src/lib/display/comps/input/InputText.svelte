<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";

  /**
   * @typedef {Object} Props
   * @prop {string} value - The value of the input.
   * @prop {boolean} [focus_on_mount=false] - Whether to focus the input when it is mounted.
   * @prop {boolean} [can_clear=false] - Whether to show a clear button when the input has a value.
   * @prop {(value: string) => *} [onchange] - Callback function to call when the input value changes.
   */

  /** @type {Props & Record<string, any>} */
  const { value, focus_on_mount = false, can_clear = false, onchange = () => {}, ...rest } = $props();

  function clearValue() {
    onchange("");
  }

  /**
   * @param {Event} event
   */
  function handleInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    onchange(target.value);
  }

  /**
   * Focus the input element when it is mounted.
   * @param {HTMLElement} node
   */
  function init(node) {
    if (!focus_on_mount) return;

    setTimeout(() => node.focus(), 100);
  }
</script>

<div class="relative w-full">
  <input
    {...rest}
    use:init
    type="text"
    {value}
    oninput={handleInput}
    class={[
      "bg-card border border-default p-2 h-12 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary",
      rest.class ?? "",
    ]}
  />

  {#if can_clear && value}
    <ButtonClear onclick={clearValue} class="absolute right-0 top-0 bottom-0" />
  {/if}
</div>
