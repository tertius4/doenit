/**
 * Attachment for a modal backdrop: calls `onclose` only when the press both starts and ends on the backdrop itself.
 * A plain click would also fire when e.g. selecting text inside the panel and releasing the mouse outside it.
 * @param {(e: MouseEvent) => void} onclose
 * @returns {import("svelte/attachments").Attachment<HTMLElement>}
 */
export function backdropClose(onclose) {
  return (node) => {
    let pressed_on_backdrop = false;

    /** @param {PointerEvent} e */
    const down = (e) => (pressed_on_backdrop = e.target === node);

    /** @param {MouseEvent} e */
    const click = (e) => {
      const should_close = pressed_on_backdrop && e.target === node;
      pressed_on_backdrop = false;
      if (should_close) onclose(e);
    };

    node.addEventListener("pointerdown", down);
    node.addEventListener("click", click);

    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("click", click);
    };
  };
}
