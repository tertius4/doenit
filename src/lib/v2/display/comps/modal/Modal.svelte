<script>
  import { backHandler } from "$logic/navigation";
  import CloseButton from "./CloseButton.svelte";
  import { quadInOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { on } from "svelte/events";

  /**
   * @typedef {Object} Props
   * @property {boolean} [close_button=true]
   * @property {boolean} [is_open=true]
   * @property {boolean} [close_on_outside_click=true]
   * @property {function(Event=): void} [onclose]
   * @property {function(Event=): void} [onsubmit] - If provided, the modal will render a form and call this function on submit.
   * @property {string | Record<string, string>} [class]
   * @property {import("svelte").Snippet} [children]
   */

  /** @type {Props} */
  let { is_open = $bindable(true), ...props } = $props();
  // svelte-ignore state_referenced_locally
  const {
    close_button = true,
    close_on_outside_click = true,
    onsubmit,
    onclose,
    children,
    class: class_name,
    ...rest
  } = props;

  onMount(() => {
    const token = backHandler.register(() => {
      if (is_open) handleClose();
      return is_open;
    }, 1000);

    return () => backHandler.unregister(token);
  });

  /** @param {Event} e */
  function handleBackdropClick(e) {
    if (close_on_outside_click === false) return;
    if (e.target !== e.currentTarget) return;

    handleClose();
  }

  function handleClose() {
    is_open = false;
    if (onclose) onclose();
  }

  /** @param {Event} event */
  function handleSubmit(event) {
    event.preventDefault();
    if (onsubmit) onsubmit(event);
  }

  // Prevent body scroll when modal is open.
  $effect(() => {
    if (!is_open) return;

    document.body.style.overflow = "hidden";

    return () => (document.body.style.overflow = "");
  });

  function closeOnEsc() {
    return on(window, "keydown", (e) => {
      if (e.key === "Escape") handleClose();
    });
  }
</script>

{#if is_open}
  <div
    {...rest}
    class="fixed top-0 left-0 z-50 flex h-dvh w-dvw items-center justify-center bg-black/40"
    transition:fade={{ duration: 150, easing: quadInOut }}
    onclick={handleBackdropClick}
    role="none"
  >
    <div
      aria-modal="true"
      {@attach closeOnEsc}
      role="dialog"
      class="relative shadow-lg max-h-[90dvh] w-125 max-w-[90dvw] overflow-y-auto rounded-lg bg-surface p-4"
    >
      <CloseButton class="absolute top-2 right-2" hidden={!close_button} onclose={handleClose} />
      <form class={class_name} onsubmit={handleSubmit}>
        {@render children?.()}
      </form>
    </div>
  </div>
{/if}
