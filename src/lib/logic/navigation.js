import { goto } from "$app/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Toast } from "@capacitor/toast";
import { pathOf } from "$lib";

/**
 * Priority-based back button handler service
 * Higher priority handlers are executed first
 *
 * 1000+     : Modal dialogs, critical overlays
 * 100-999   : Feature overlays (fullscreen, filters)
 * 10-99     : Secondary features (search, selection)
 * 0-9       : Component-level handlers
 * -1 to -99 : Navigation
 * -100+     : Fallback/exit
 */
class BackHandlerService {
  /** @type {Map<symbol, { handler: () => boolean | void | Promise<boolean | void>, priority: number }>} */
  handlers = new Map();

  /**
   * Register a back handler
   * @param {() => (boolean | void | Promise<boolean | void>)} handler - Return true to prevent further handlers
   * @param {number} priority - Higher priority executes first (default: 0)
   * @returns {symbol} token for unregistering
   */
  register(handler, priority = 0) {
    const token = Symbol();
    this.handlers.set(token, { handler, priority });
    return token;
  }

  /**
   * Unregister a back handler
   * @param {symbol} token
   */
  unregister(token) {
    this.handlers.delete(token);
  }

  /**
   * Execute back handlers in priority order
   * @returns {Promise<boolean>} - true if handled, false if should use default behavior
   */
  async handle() {
    const sorted = Array.from(this.handlers.values())
      .reverse()
      .sort((a, b) => b.priority - a.priority);

    for (const { handler } of sorted) {
      const handled = await handler();
      if (handled) return true;
    }

    return false;
  }

  /**
   * Clear all handlers (useful for cleanup)
   */
  clear() {
    this.handlers.clear();
  }
}

export const backHandler = new BackHandlerService();

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
    const path = pathOf(to.url) + to.url.search;

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

const EXIT_WINDOW_MS = 2000;

/**
 * Wire the Android hardware back button to the backHandler.
 * When nothing handles it: go back, or on the home page require a double press to exit.
 *
 * @param {() => string} getExitMessage - Translated "press again to exit" text
 * @returns {() => void} cleanup
 */
export function installHardwareBack(getExitMessage) {
  if (!Capacitor.isNativePlatform()) return () => {};

  let last_press = 0;

  const listener = App.addListener("backButton", async () => {
    if (await backHandler.handle()) return;

    if (pathOf(window.location) !== "/") {
      navHistory.back("/");
      return;
    }

    const now = Date.now();
    if (now - last_press < EXIT_WINDOW_MS) return App.exitApp();

    last_press = now;
    await Toast.show({ text: getExitMessage(), duration: "short" });
  });

  return () => {
    listener.then((l) => l.remove());
  };
}
