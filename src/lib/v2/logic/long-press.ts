interface LongPressOptions {
  duration?: number;
  moveThreshold?: number;
}

interface LongPressState {
  timer: number | null;
  isPressed: boolean;
  hasTriggered: boolean;
  startPosition: { x: number; y: number };
}

interface Position {
  x: number;
  y: number;
}

interface EventListener {
  target: Node | Window;
  type: string;
  handler: (event: Event) => void;
}

interface LongPressAction {
  destroy(): void;
  update(newOptions?: LongPressOptions): void;
}

/**
 * LongPress utility class for handling long press gestures on DOM elements
 */
class LongPress {
  private config: Required<LongPressOptions>;
  private state: LongPressState;
  private eventListeners: EventListener[];
  private node: Node;

  private constructor(node: Node, options: LongPressOptions = {}) {
    this.node = node;
    this.config = {
      duration: 500,
      moveThreshold: 10,
      ...options,
    };

    this.state = {
      timer: null,
      isPressed: false,
      hasTriggered: false,
      startPosition: { x: 0, y: 0 },
    };

    // Event listener definitions
    this.eventListeners = [
      // Mouse events
      { target: node, type: "mousedown", handler: this.handleStart.bind(this) },
      { target: window, type: "mousemove", handler: this.handleMove.bind(this) },
      { target: window, type: "mouseup", handler: this.handleEnd.bind(this) },

      // Touch events
      { target: node, type: "touchstart", handler: this.handleStart.bind(this) },
      { target: window, type: "touchmove", handler: this.handleMove.bind(this) },
      { target: window, type: "touchend", handler: this.handleEnd.bind(this) },
      { target: window, type: "touchcancel", handler: this.handleEnd.bind(this) },
    ];

    // Initialize event listeners
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.addEventListener(type, handler, { passive: true });
    });
  }

  /**
   * Creates a longpress action for both mouse and touch events
   * @param node - The DOM node to attach the longpress to
   * @param options - Configuration options
   * @returns Object with destroy and update methods
   */
  static create(node: Node, options: LongPressOptions = {}): LongPressAction {
    const instance = new LongPress(node, options);

    return {
      destroy: () => instance.destroy(),
      update: (newOptions?: LongPressOptions) => instance.update(newOptions),
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: Position, point2: Position): number {
    const deltaX = Math.abs(point2.x - point1.x);
    const deltaY = Math.abs(point2.y - point1.y);
    return Math.max(deltaX, deltaY); // Use max for square threshold
  }

  /**
   * Start the longpress timer and track initial position
   */
  private handleStart(event: Event): void {
    this.state.isPressed = true;
    this.state.startPosition = LongPress.getEventCoordinates(event as MouseEvent | TouchEvent);

    this.state.timer = window.setTimeout(() => {
      if (this.state.isPressed) {
        this.node.dispatchEvent(
          new CustomEvent("longpress", {
            detail: {
              event,
              duration: this.config.duration,
              startPosition: this.state.startPosition,
            },
          }),
        );
      }
      this.state.timer = null;
    }, this.config.duration);
  }

  /**
   * Check for movement and cancel if threshold exceeded
   */
  private handleMove(event: Event): void {
    if (!this.state.isPressed) return;

    const currentPosition = LongPress.getEventCoordinates(event as MouseEvent | TouchEvent);
    const distance = this.calculateDistance(this.state.startPosition, currentPosition);

    if (distance > this.config.moveThreshold) {
      this.cancelPress();
    }
  }

  /**
   * End the press interaction
   */
  private handleEnd(event: Event): void {
    this.cancelPress();
  }

  /**
   * Cancel the current press and clean up
   */
  private cancelPress(): void {
    this.state.isPressed = false;
    if (this.state.timer !== null) {
      clearTimeout(this.state.timer);
      this.state.timer = null;
    }
  }

  /**
   * Clean up all event listeners and cancel any active press
   */
  private destroy(): void {
    // Remove all event listeners
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.cancelPress();
  }

  /**
   * Update configuration options
   */
  private update(newOptions: LongPressOptions = {}): void {
    this.config = {
      ...this.config,
      ...newOptions,
    };
  }

  /**
   * Extract coordinates from mouse or touch event
   */
  private static getEventCoordinates(event: MouseEvent | TouchEvent): Position {
    if (LongPress.isMouseEvent(event)) {
      return { x: event.clientX, y: event.clientY };
    }

    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    // Fallback for touch end events
    if (event.changedTouches && event.changedTouches.length > 0) {
      return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }

    return { x: 0, y: 0 };
  }

  /**
   * Type guard to check if event is a MouseEvent
   */
  private static isMouseEvent(event: MouseEvent | TouchEvent): event is MouseEvent {
    return event.type.startsWith("mouse");
  }
}

export function longpress(node: Node, options: LongPressOptions = {}): LongPressAction {
  return LongPress.create(node, options);
}
