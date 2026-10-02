import { cubicIn, cubicOut } from "svelte/easing";

/** Keep in sync with the re-add delay in `completeTaskHandler` (logic/api/task.js). */
export const TASK_OUT_MS = 350;
export const TASK_IN_MS = 350;

/** Fraction of the transition used for moving; the rest is spent collapsing/expanding the height. */
const MOVE_PART = 0.6;

/**
 * Slide to the right and fade, then collapse so the items below close up.
 * @param {Element} node
 */
export function taskOut(node) {
  const style = getComputedStyle(node);
  const height = parseFloat(style.height);
  const margin_top = parseFloat(style.marginTop);
  const margin_bottom = parseFloat(style.marginBottom);

  return {
    duration: TASK_OUT_MS,
    css: (/** @type {number} */ t, /** @type {number} */ u) => {
      const progress = 1 - t;
      const move = cubicIn(Math.min(progress / MOVE_PART, 1));
      const collapse = cubicOut(Math.max((progress - MOVE_PART) / (1 - MOVE_PART), 0));
      const remaining = 1 - collapse;
      return `
        overflow: hidden;
        transform: translateX(${move * 100}%);
        opacity: ${1 - move};
        height: ${height * remaining}px;
        margin-top: ${margin_top * remaining}px;
        margin-bottom: ${margin_bottom * remaining}px;
      `;
    },
  };
}

/**
 * Open up space first, then drop in from the top.
 * @param {Element} node
 */
export function taskIn(node) {
  const style = getComputedStyle(node);
  const height = parseFloat(style.height);
  const margin_top = parseFloat(style.marginTop);
  const margin_bottom = parseFloat(style.marginBottom);
  const expand_part = 1 - MOVE_PART;

  return {
    duration: TASK_IN_MS,
    css: (/** @type {number} */ t) => {
      const expand = cubicOut(Math.min(t / expand_part, 1));
      const drop = cubicOut(Math.max((t - expand_part) / MOVE_PART, 0));
      return `
        overflow: hidden;
        transform: translateY(${(1 - drop) * -100}%);
        opacity: ${drop};
        height: ${height * expand}px;
        margin-top: ${margin_top * expand}px;
        margin-bottom: ${margin_bottom * expand}px;
      `;
    },
  };
}

/**
 * How long the list must stay empty before the empty state is shown. A recurring task is briefly
 * absent while it re-enters, which must not flash the empty state.
 */
export const EMPTY_STATE_DELAY_MS = 900;
