<script>
  import { LongPress } from "$lib/services/long_press.svelte";
  import { t } from "$lib/services/language.svelte";
  import { Check } from "$lib/icon";

  let {
    tick_animation = $bindable(false),
    is_selected = $bindable(false),
    onselect = async () => {},
    onlongpress = () => {},
    ...rest
  } = $props();

  const is_checked = $derived(is_selected || tick_animation);

  /**
   * Handles the click event on the checkbox.
   * @param {Event} event
   */
  async function onclick(event) {
    tick_animation = !tick_animation;
    onselect(event);
  }
</script>

<button
  {...rest}
  use:LongPress.create
  type="button"
  aria-label={t("check")}
  {onlongpress}
  {onclick}
  class="absolute flex items-center justify-center {rest.class}"
>
  <div
    class={{
      "rounded border h-6 w-6 flex items-center justify-center": true,
      "border-primary shadow-none bg-primary": is_checked,
      "bg-white shadow-inner shadow-black border-default": !is_checked,
    }}
  >
    {#if is_checked}
      <Check class="text-alt text-lg" />
    {/if}
  </div>
</button>
