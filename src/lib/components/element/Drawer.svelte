<script>
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @property {boolean} [is_open=false] - Whether the drawer is open
   * @property {() => void} [onclose] - Callback function when drawer closes
   */

  /** @type {Props & Record<string, any>} */
  let { is_open = $bindable(false), onclose, children } = $props();

  let start_y = 0;
  let current_y = 0;
  let is_dragging = false;
  let translate_y = $state(0);

  /**
   * Handles the start of a touch event.
   * @param {TouchEvent} e
   */
  function handleTouchStart(e) {
    start_y = e.touches[0].clientY;
    is_dragging = true;
  }

  /**
   * Handles touch move events for drag gesture.
   * @param {TouchEvent} e
   */
  function handleTouchMove(e) {
    if (!is_dragging) return;
    current_y = e.touches[0].clientY;
    const diff = current_y - start_y;
    if (diff > 0) {
      translate_y = diff;
    }
  }

  /**
   * Handles the end of a touch event.
   */
  function handleTouchEnd() {
    if (!is_dragging) return;
    is_dragging = false;

    if (translate_y > 100) {
      close();
    } else {
      translate_y = 0;
    }
  }

  /**
   * Handles click on the backdrop.
   */
  function handleBackdropClick() {
    close();
  }

  /**
   * Closes the drawer.
   */
  function close() {
    is_open = false;
    translate_y = 0;
    if (onclose) onclose();
  }

  /**
   * Handles keyboard events.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === "Escape" && is_open) {
      close();
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

{#if is_open}
  <div class="fixed top-0 left-0 right-0 bottom-0 z-50 pointer-events-none">
    <!-- Backdrop -->
    <button
      class="absolute top-0 left-0 right-0 bottom-0 bg-black/40 pointer-events-auto border-none cursor-pointer"
      onclick={handleBackdropClick}
      transition:fade={{ duration: 200 }}
      aria-label="Close drawer"
    ></button>

    <!-- Drawer -->
    <div
      class="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl min-h-[40vh] max-h-[90vh] flex flex-col pointer-events-auto shadow-lg"
      transition:fly={{ y: 300, duration: 300 }}
      style="transform: translateY({translate_y}px)"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      <!-- Handle -->
      <div class="flex justify-center p-3 cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
