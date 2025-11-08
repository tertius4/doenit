<script>
  import { DownChevron, Lock } from "$lib/icon";
  import { slide } from "svelte/transition";
  import { t } from "$lib/services/language.svelte";
  import Loading from "$lib/icon/Loading.svelte";

  /**
   * @typedef {Object} Props
   * @property {string} label
   * @property {boolean} [loading=false]
   * @property {boolean} [show=false]
   * @property {boolean} [disabled=false]
   * @property {string} [disabled_message=""]
   * @property {import("svelte").Snippet} children
   */

  /** @type {Props} */
  let {
    children,
    label,
    show = $bindable(false),
    disabled = false,
    disabled_message = "",
    loading,
    ...rest
  } = $props();
</script>

<div class={["bg-surface rounded-lg", disabled ? "opacity-60" : "", rest.class || ""]}>
  <button
    type="button"
    aria-label={t("accordion_toggle")}
    aria-expanded={show}
    {disabled}
    class={{
      "focus:outline-none w-full p-4 flex items-center justify-between rounded-lg transition-colors": true,
      "cursor-not-allowed": disabled,
      "hover:bg-t-primary-700 active:bg-t-primary-700": !disabled,
    }}
    onclick={() => {
      if (disabled) return;

      show = !show;
    }}
  >
    <div class="flex items-center gap-2">
      {#if loading}
        <Loading class="text-lg" />
      {:else if disabled}
        <Lock class="text-lg" />
      {/if}
      <span class="font-semibold text-lg">
        {label}
      </span>
      {#if !loading}
        <span>
          {disabled && disabled_message ? `(${disabled_message})` : ""}
        </span>
      {/if}
    </div>

    {#if !disabled || loading}
      <DownChevron class="text-xl {show ? 'rotate-180' : ''}" />
    {/if}
  </button>

  {#if show && !disabled}
    <div transition:slide class="px-4 pb-4 space-y-3">
      {@render children()}
    </div>
  {/if}
</div>
