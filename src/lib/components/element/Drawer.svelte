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

  // Refs to DOM nodes
  /** @type {HTMLDivElement} */
  let drawerEl;
  /** @type {HTMLDivElement} */
  let handleEl;

  // Dragging state
  let startY = 0;
  let isDragging = false;
  let pendingTranslate = 0; // pixels
  let rafId = null;
  const RELEASE_THRESHOLD = 120;

  // Apply pending translate in RAF to avoid too many DOM updates
  function applyPendingTransform() {
    rafId = null;
    if (!drawerEl) return;
    drawerEl.style.transform = `translate3d(0, ${Math.max(0, pendingTranslate)}px, 0)`;
  }

  /** Start drag from handle */
  function handleTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    pendingTranslate = 0;
    if (drawerEl) drawerEl.style.transition = "none";
    e.stopPropagation();
  }

  /** Move while dragging */
  function handleTouchMove(e) {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    pendingTranslate = diff > 0 ? diff : 0;
    if (!rafId) rafId = requestAnimationFrame(applyPendingTransform);
    e.preventDefault();
  }

  /** End drag */
  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      applyPendingTransform();
    }

    const finalTranslate = pendingTranslate;
    if (drawerEl) drawerEl.style.transition = "transform 200ms cubic-bezier(.22,.9,.32,1)";

    if (finalTranslate > RELEASE_THRESHOLD) {
      // animate out then close
      if (drawerEl) drawerEl.style.transform = `translate3d(0, 100%, 0)`;
      setTimeout(() => {
        close();
        if (drawerEl) {
          drawerEl.style.transition = "";
          drawerEl.style.transform = "";
        }
      }, 220);
    } else {
      // snap back
      if (drawerEl) drawerEl.style.transform = `translate3d(0, 0, 0)`;
      setTimeout(() => {
        pendingTranslate = 0;
        if (drawerEl) drawerEl.style.transition = "";
      }, 220);
    }
  }

  function handleBackdropClick() {
    close();
  }

  function close() {
    is_open = false;
    pendingTranslate = 0;
    if (onclose) onclose();
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && is_open) {
      close();
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      if (rafId) cancelAnimationFrame(rafId);
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
      bind:this={drawerEl}
      class="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl min-h-[40vh] max-h-[90vh] flex flex-col pointer-events-auto shadow-lg"
      transition:fly={{ y: 300, duration: 300 }}
      style="will-change: transform;"
      role="dialog"
      aria-modal="true"
    >
      <!-- Handle -->
      <div
        bind:this={handleEl}
        class="flex justify-center p-3 cursor-grab active:cursor-grabbing touch-action-none"
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
      >
        <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
      </div>

      <!-- Content -->
      <div class="h-full">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
