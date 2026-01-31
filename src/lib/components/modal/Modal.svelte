<script>
  import { backHandler } from "$lib/BackHandler.svelte";
  import { t } from "$lib/services/language.svelte";
  import { quadInOut } from "svelte/easing";
  import { onMount, untrack } from "svelte";
  import { fade } from "svelte/transition";
  import Icon from "$lib/components/element/Icon.svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} [close_button=true]
   * @property {boolean} [is_open=true]
   * @property {function(Event=): void} [onclose]
   */

  /** @type {Props & { [key: string]: any }} */
  let { is_open = $bindable(true), children, close_button = true, onclose, ...rest } = $props();

  onMount(() => {
    const token = backHandler.register(() => {
      if (is_open) {
        handleClose();
        return true;
      }
      return false;
    }, 1000);

    return () => backHandler.unregister(token);
  });

  /**
   * Handles click on the backdrop.
   * @param {Event} e
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleClose(e);
    }
  }

  function handleClose() {
    is_open = false;
    if (onclose) onclose();
  }

  // Prevent body scroll when modal is open (Fix #7)
  $effect(() => {
    if (is_open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  });
</script>

{#if is_open}
  <div
    class="fixed top-0 left-0 z-50 flex h-dvh w-dvw items-center justify-center bg-black/40"
    transition:fade={{ duration: 125, easing: quadInOut }}
    onclick={handleBackdropClick}
    role="none"
  >
    <form
      {...rest}
      class={[
        "relative shadow-lg max-h-[90dvh] w-125 max-w-[90dvw] overflow-y-auto rounded-lg bg-surface p-4",
        rest.class || "",
      ]}
      onsubmit={(event) => {
        event.preventDefault();
        if (rest.onsubmit) rest.onsubmit(event);
      }}
      role="dialog"
      aria-modal="true"
    >
      {#if close_button}
        <button
          class="absolute top-2 right-2 p-2 rounded-full aspect-square"
          aria-label={t("close_modal")}
          title={t("close")}
          onclick={handleClose}
        >
          <Icon name="times" class="text-lg" />
        </button>
      {/if}
      {@render children()}
    </form>
  </div>
{/if}
