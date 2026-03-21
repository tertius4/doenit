<script>
  import { untrack } from "svelte";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte"

  let { value = $bindable(), focus_on_mount = false, debounce = 0, can_clear = false, ...rest } = $props();

  let internal_value = $state(value);
  /** @type {NodeJS.Timeout | null} */
  let timeout = null;

  $effect(() => {
    internal_value;

    untrack(() => {
      if (debounce > 0) {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => (value = internal_value), debounce);
      } else {
        value = internal_value;
      }
    });
  });

  function clearValue() {
    internal_value = "";
  }

  /**
   * Focus the input element when it is mounted.
   * @param {HTMLElement} el
   */
  function init(el) {
    if (!focus_on_mount) return;

    setTimeout(() => {
      el?.focus();
      el?.click();
    }, 100);
  }
</script>

<div class="relative w-full">
  <input
    {...rest}
    use:init
    type="text"
    bind:value={internal_value}
    class={[
      "bg-card border border-default p-2 h-12 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary",
      rest.class ?? "",
    ]}
  />

  {#if can_clear && value}
    <ButtonClear onclick={clearValue} class="absolute right-0 top-0 bottom-0" />
  {/if}
</div>
