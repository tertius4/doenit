import { EMPTY_STATE_DELAY_MS } from "./task-transitions";

/**
 * True only once the list has been empty for a while, to avoid flashing the empty state
 * while a completed recurring task is on its way back into the list.
 * @param {() => number} getCount
 */
export function useDelayedEmpty(getCount) {
  let value = $state(false);

  $effect(() => {
    if (getCount() > 0) {
      value = false;
      return;
    }
    const timer = setTimeout(() => (value = true), EMPTY_STATE_DELAY_MS);
    return () => clearTimeout(timer);
  });

  return {
    get value() {
      return value;
    },
  };
}
