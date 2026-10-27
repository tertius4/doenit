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
   * @property {string} [disabled_message=""] - Explains why it is disabled; shown on tapping the (i) button.
   * @property {import("svelte").Snippet} children
   */

  /** @type {Props & Record<string, any>} */
  let {
    show = $bindable(false),
    children,
    label,
    disabled = false,
    disabled_message = "",
    loading,
    ...rest
  } = $props();

  /** Whether the user tapped (i) to see why the section is disabled. */
  let show_message = $state(false);

  function toggle() {
    if (disabled) return;

    show = !show;
  }
</script>

<div class={["bg-surface rounded-lg", disabled ? "opacity-60" : "", rest.class || ""]}>
  <div class="flex items-center">
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
          <Icon name="lock" class="text-lg" size={18} />
        {/if}
        <span class="font-semibold text-lg">{label}</span>
      </div>

      {#if !disabled || loading}
        <Icon name="chevron-down" class="text-xl {show ? 'rotate-180' : ''}" />
      {/if}
    </button>

    {#if disabled && disabled_message}
      <button
        type="button"
        aria-label={t("more_info")}
        aria-expanded={show_message}
        class="p-4 shrink-0"
        onclick={() => (show_message = !show_message)}
      >
        <Icon name="info" class="text-xl" size={18} />
      </button>
    {/if}
  </div>

  {#if disabled && show_message}
    <p transition:slide class="px-4 pb-4 text-sm text-muted">{disabled_message}</p>
  {/if}

  {#if show && !disabled}
    <div transition:slide class="px-4 pb-4 space-y-3">
      {@render children()}
    </div>
  {/if}
</div>
