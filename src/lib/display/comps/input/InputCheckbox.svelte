<script>
  import { longpress } from "$logic/long-press";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} checked
   * @property {(checked: boolean) => (void | Promise<void>)} [onchange]
   * @property {(checked: boolean) => (void | Promise<void>)} [onlongpress]
   */

  /** @type {Props & Record<string, any>} */
  const { checked, onchange = async (checked) => {}, onlongpress = (checked) => {}, ...rest } = $props();

  /**
   * Handles the click event on the checkbox.
   * @param {Event} event
   */
  async function onclick(event) {
    event.stopPropagation();
    
    onchange(!checked);
  }
</script>

<button
  {...rest}
  use:longpress
  type="button"
  aria-label={t("check")}
  title={t("check")}
  {onlongpress}
  {onclick}
  class={["relative cursor-pointer rounded overflow-hidden h-6 w-6", rest.class || ""]}
>
  <div
    class={{
      "absolute inset-0 pointer-events-none border flex items-center justify-center": true,
      "border-primary bg-primary/70": checked,
      "shadow-inner bg-white shadow-black border border-default": !checked,
    }}
  >
    {#if checked}
      <Icon name="check" class="text-alt" />
    {/if}
  </div>
</button>
