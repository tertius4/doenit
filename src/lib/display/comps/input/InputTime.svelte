<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import { on } from "svelte/events";

  /**
   * @typedef {Object} Props
   * @property {string | null} [value] - The time value in HH:MM format.
   * @property {boolean} [can_clear=true] - Whether the time input can be cleared.
   * @property {(value: string | undefined) => void} [onchange] - Callback function when the time changes.
   */

  /** @type {Props & Record<string, any>} */
  const { value, can_clear = true, onchange = () => {}, ...rest } = $props();

  let is_focused = $state(false);

  const display_value = $derived(value);

  /**
   * Handles input change events.
   * @param {Event} e
   */
  function handleChange(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const newValue = target.value || undefined;

    onchange(newValue);

    // Close the picker after selection
    if (newValue) {
      is_focused = false;
    }
  }

  /**
   * Clears the time input value.
   * @param {MouseEvent} e
   */
  function clearValue(e) {
    e.stopPropagation();
    onchange(undefined);
    is_focused = false;
  }

  /**
   *
   * @param {HTMLInputElement} node
   */
  function showPicker(node) {
    return on(window, "click", () => {
      if (is_focused) {
        node.showPicker();
      }
    });
  }
</script>

<div class="relative w-full">
  <input
    {...rest}
    id={undefined}
    type="text"
    value={display_value}
    onfocus={() => (is_focused = true)}
    onblur={() => (is_focused = false)}
    class={[
      {
        "bg-card p-2 w-full h-12 rounded-lg placeholder:text-muted border border-default outline-none focus:ring-1 ring-primary": true,
      },
      rest.class ?? "",
    ]}
  />
  {#if can_clear && !!value}
    <ButtonClear onclick={clearValue} class="absolute top-0 bottom-0 right-0" />
  {/if}
  <input class="absolute invisible inset-0" onchange={handleChange} type="time" {@attach showPicker} />
</div>
