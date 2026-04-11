<script>
  import { slide } from "svelte/transition";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @property {string} label
   * @property {boolean} [loading=false]
   * @property {boolean} [show=false]
   * @property {boolean} [disabled=false]
   * @property {string} [disabled_message=""]
   * @property {import("svelte").Snippet} children
   */

  /** @type {Props & Record<string, any>} */
  let { show = $bindable(false), ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { children, label, disabled = false, disabled_message: message = "", loading, ...rest } = props;

  const disabled_message = disabled && message ? `(${message})` : "";

  function toggle() {
    if (disabled) return;

    show = !show;
  }
</script>

<div class={["bg-surface rounded-lg", disabled ? "opacity-60" : "", rest.class || ""]}>
  <button
    type="button"
    aria-label={t("accordion_toggle")}
    aria-expanded={show}
    onclick={toggle}
    {disabled}
    class={{
      "focus:outline-none w-full p-4 flex items-center justify-between rounded-lg transition-colors": true,
      "cursor-not-allowed": disabled,
      "hover:bg-t-primary-700 active:bg-t-primary-700": !disabled,
    }}
  >
    <div class="flex items-center gap-2">
      {#if loading}
        <Icon name="loading" class="animate-spin text-lg" />
      {:else if disabled}
        <Icon name="lock" class="text-lg" />
      {/if}
      <span class="font-semibold text-lg">{label}</span>
      {#if !loading}
        <span>{disabled_message}</span>
      {/if}
    </div>

    {#if !disabled || loading}
      <Icon name="chevron-down" class="text-xl {show ? 'rotate-180' : ''}" />
    {/if}
  </button>

  {#if show && !disabled}
    <div transition:slide class="px-4 pb-4 space-y-3">
      {@render children()}
    </div>
  {/if}
</div>
