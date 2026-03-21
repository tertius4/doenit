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
  handlers = $state(new Map());

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
   * @returns {boolean} - true if handled, false if should use default behavior
   */
  handle() {
    const sorted = Array.from(this.handlers.values())
      .reverse()
      .sort((a, b) => b.priority - a.priority);

    for (const { handler } of sorted) {
      const handled = handler();
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
