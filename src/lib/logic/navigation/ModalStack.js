/**
 * Tracks open modals/dialogs so that only the topmost one reacts to Esc / back,
 * and keeps the page scroll locked until the last one closes.
 */
class ModalStackService {
  /** @type {symbol[]} */
  #stack = [];

  /**
   * Register an open modal.
   * @returns {symbol} token, pass to `remove` when the modal closes
   */
  push() {
    const token = Symbol();
    this.#stack.push(token);
    this.#syncScroll();
    return token;
  }

  /** @param {symbol} token */
  remove(token) {
    this.#stack = this.#stack.filter((t) => t !== token);
    this.#syncScroll();
  }

  /** @param {symbol} token */
  isTop(token) {
    return this.#stack[this.#stack.length - 1] === token;
  }

  #syncScroll() {
    if (typeof document === "undefined") return;
    document.body.style.overflow = this.#stack.length ? "hidden" : "";
  }
}

export const modalStack = new ModalStackService();
