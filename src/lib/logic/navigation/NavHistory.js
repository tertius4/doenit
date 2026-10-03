import { goto } from "$app/navigation";

/**
 * In-app navigation history. Mirrors the browser history so "back" can go to the
 * real previous screen instead of a hardcoded parent route.
 */
class NavHistoryService {
  /** @type {string[]} */
  #stack = [];

  /**
   * Feed with SvelteKit's `afterNavigate` navigation object.
   * @param {{ type: string, to: { url: URL } | null, delta?: number }} navigation
   */
  record({ type, to, delta }) {
    if (!to) return;
    const path = to.url.pathname + to.url.search;

    if (type === "popstate" && delta) {
      // Back pops entries, forward re-adds one.
      if (delta < 0) this.#stack = this.#stack.slice(0, Math.max(1, this.#stack.length + delta));
      else this.#stack.push(path);
      return;
    }

    if (type === "enter" || !this.#stack.length) this.#stack = [path];
    else if (this.#stack.at(-1) !== path) this.#stack.push(path);
  }

  get canGoBack() {
    return this.#stack.length > 1;
  }

  /**
   * Go to the previous screen, or to `fallback` when there is nothing to go back to.
   * @param {string} [fallback]
   * @returns {true} Always true so it can be returned from a back handler.
   */
  back(fallback = "/") {
    if (this.canGoBack) history.back();
    else goto(fallback, { replaceState: true });
    return true;
  }
}

export const navHistory = new NavHistoryService();
