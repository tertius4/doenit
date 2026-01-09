/**
 * This file may only import files, that does not import any other files in src.
 */

import { t } from "./services/language.svelte";
import * as env from "$env/static/public";
import { DateUtil } from "./core/date_util.js";
import { user } from "./base/user.svelte";

export const AFRIKAANS = Symbol("af");
export const ENGLISH = Symbol("en");
export const DEFAULT_HEX_COLOR = "#2b2f31";
export const BACKUP_APP_NAME = "[DEFAULT]";
export const COMPLETE_TASK_DELAY_MS = 400;
export const INVITE_EXPIRATION_DAYS = 7;
export const MAX_INVITES_PER_DAY = 3;
export const APP_NAME = env.PUBLIC_APP_ID || "doenit.app";
export const FIREBASE_CONFIG = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY,
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.PUBLIC_FIREBASE_APP_ID,
};

/** @type {{ value: symbol | null }} */
export let BACK_BUTTON_FUNCTION = { value: null };

// TODO: Migrate these date functions to /core/date_util.js

/**
 * Get the current locale for date formatting
 * @returns {string} The locale string (e.g., "af-ZA" or "en-US")
 */
function getCurrentLocale() {
  return user.language_code === "af" ? "af-ZA" : "en-GB";
}

/**
 * @param {Object} a0
 * @param {string | Date | number | null} a0.due_date
 * @param {string | Date | number | null} [a0.start_date]
 */
export function displayDate({ due_date, start_date }) {
  if (!start_date) return "";

  if (!due_date) {
    return new Date(start_date).toLocaleDateString(getCurrentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const startDate = new Date(new Date(start_date).setHours(0, 0, 0, 0));
  const dueDate = new Date(new Date(due_date).setHours(0, 0, 0, 0));

  const startYear = startDate.getFullYear();
  const dueYear = dueDate.getFullYear();
  const startMonth = startDate.getMonth();
  const dueMonth = dueDate.getMonth();

  // Same date
  if (+startDate === +dueDate) {
    return startDate.toLocaleDateString(getCurrentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Same year and month
  if (startYear === dueYear && startMonth === dueMonth) {
    return `${startDate.getDate()}-${dueDate.getDate()} ${startDate.toLocaleDateString(getCurrentLocale(), {
      month: "short",
      year: "numeric",
    })}`;
  }

  // Same year, different month
  if (startYear === dueYear) {
    const startStr = startDate.toLocaleDateString(getCurrentLocale(), { month: "short", day: "numeric" });
    const dueStr = dueDate.toLocaleDateString(getCurrentLocale(), { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} - ${dueStr}`;
  }

  // Different years
  const startStr = startDate.toLocaleDateString(getCurrentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const dueStr = dueDate.toLocaleDateString(getCurrentLocale(), { year: "numeric", month: "short", day: "numeric" });
  return `${startStr} - ${dueStr}`;
}

/**
 *
 * @param {Date | null} date
 * @returns {boolean}
 */
export function isTimeAtMidnight(date) {
  if (!date) return false;

  return date.getHours() === 0 && date.getMinutes() === 0;
}

/**
 * @param {{ start: string | Date | null, end: string | Date | null}} param0 - In format of YYYY-MM-DD or YYYY-MM-DD HH:mm
 * @returns
 */
export function displayDateRange({ start, end }) {
  if (!start) {
    return end ? displayDate({ due_date: end }) : "";
  }

  if (!end) {
    return `${displayDate({ due_date: start })} – ${t("forever")}`;
  }

  if (start instanceof Date) {
    start = start.toLocaleString(getCurrentLocale()).substring(0, 16);
  }

  if (end instanceof Date) {
    end = end.toLocaleString(getCurrentLocale()).substring(0, 16);
  }

  const [start_date] = start.split(" ");
  const [start_year, start_month, start_day] = start_date.split("-");
  const [end_date] = end.split(" ");
  const [end_year, end_month, end_day] = end_date.split("-");

  if (start_year === end_year && start_month === end_month && start_day === end_day) {
    const dateStr = new Date(start_date).toLocaleDateString(getCurrentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return dateStr;
  }

  if (start_year === end_year && start_month === end_month) {
    const monthYear = new Date(start_date).toLocaleDateString(getCurrentLocale(), {
      month: "short",
      year: "numeric",
    });
    return `${start_day} – ${end_day} ${monthYear}`;
  }

  if (start_year === end_year) {
    const startStr = new Date(start_date).toLocaleDateString(getCurrentLocale(), { month: "short", day: "numeric" });
    const endStr = new Date(end_date).toLocaleDateString(getCurrentLocale(), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }
}

/**
 * @param {Object} a0
 * @param {Date | null} a0.due_date
 * @param {Date | null} [a0.start_date]
 */
export function displayDateTime({ due_date, start_date }) {
  if (!start_date) return "";

  if (!due_date || `${start_date}` === `${due_date}`) {
    const date = new Date(start_date);
    const date_str = date.toLocaleDateString(getCurrentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (isTimeAtMidnight(start_date)) {
      return date_str;
    }

    const time_str = date.toLocaleTimeString(getCurrentLocale(), {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date_str} ${time_str}`;
  }

  const startDate = new Date(start_date);
  const dueDate = new Date(due_date);

  const startDateOnly = new Date(new Date(start_date).setHours(0, 0, 0, 0));
  const dueDateOnly = new Date(new Date(due_date).setHours(0, 0, 0, 0));

  const startYear = startDateOnly.getFullYear();
  const dueYear = dueDateOnly.getFullYear();
  const startMonth = startDateOnly.getMonth();
  const dueMonth = dueDateOnly.getMonth();

  const startTime = isTimeAtMidnight(start_date)
    ? ""
    : startDate.toLocaleTimeString(getCurrentLocale(), { hour: "2-digit", minute: "2-digit" });

  // Same date
  if (+startDateOnly === +dueDateOnly) {
    const dateStr = startDateOnly.toLocaleDateString(getCurrentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (!startTime) {
      return dateStr;
    } else {
      return `${dateStr} ${startTime}`;
    }
  }

  // Same year and month
  if (startYear === dueYear && startMonth === dueMonth) {
    const monthYear = startDateOnly.toLocaleDateString(getCurrentLocale(), {
      month: "short",
      year: "numeric",
    });
    return `${startDateOnly.getDate()}${startTime ? " " + startTime : ""} - ${dueDateOnly.getDate()} ${monthYear}`;
  }

  // Same year, different month
  if (startYear === dueYear) {
    const startStr = startDateOnly.toLocaleDateString(getCurrentLocale(), { month: "short", day: "numeric" });
    const dueStr = dueDateOnly.toLocaleDateString(getCurrentLocale(), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr}${startTime ? " " + startTime : ""} - ${dueStr}`;
  }

  // Different years
  const startStr = startDateOnly.toLocaleDateString(getCurrentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const dueStr = dueDateOnly.toLocaleDateString(getCurrentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${startStr}${startTime ? " " + startTime : ""} - ${dueStr}`;
}

export function displayDateShort(date) {
  if (!date) return "";

  return new Date(date).toLocaleDateString(getCurrentLocale(), {
    month: "short",
    day: "numeric",
  });
}

/**
 * @param {number | Date | string} date
 */
export function formatDate(date) {
  if (!date) return 0;

  return new Date(date).toLocaleDateString("en-CA");
}

/**
 * @param {number | Date | string | null} start_date
 * @param {number | Date | string | null} [end_date]
 * @returns {string}
 */
export function displayPrettyDate(start_date, end_date) {
  if (!start_date) return t("no_date");

  // Check if the date is in the past
  const start_date_obj = new Date(start_date);
  const end_date_obj = end_date ? new Date(end_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if ((end_date_obj || start_date_obj) < today) {
    return t("past");
  }

  const is_start_on_or_before = DateUtil.isSameDay(start_date_obj, today) || +start_date_obj <= +today;
  if (!!end_date_obj && is_start_on_or_before && +end_date_obj >= +today) {
    return t("ongoing");
  }

  if (DateUtil.isSameDay(start_date_obj, today)) return t("ongoing");

  const tomorrow = new Date(Date.now() + 86400000);
  if (DateUtil.isSameDay(start_date_obj, tomorrow)) return t("tomorrow");

  const day_after_tomorrow = new Date(Date.now() + 2 * 86400000);
  if (DateUtil.isSameDay(start_date_obj, day_after_tomorrow)) return t("day_after_tomorrow");

  const this_week_start = new Date();
  this_week_start.setDate(this_week_start.getDate() - this_week_start.getDay());
  const this_week_end = new Date(this_week_start);
  this_week_end.setDate(this_week_end.getDate() + 6);

  if (start_date_obj >= this_week_start && start_date_obj <= this_week_end) {
    return t("this_week");
  }

  const current_month = new Date().getMonth();
  const current_year = new Date().getFullYear();
  const input_month = start_date_obj.getMonth();
  const input_year = start_date_obj.getFullYear();

  if (input_month === current_month && input_year === current_year) {
    return t("this_month");
  }

  const next_month = (current_month + 1) % 12;
  const next_month_year = next_month === 0 ? current_year + 1 : current_year;

  if (input_month === next_month && input_year === next_month_year) {
    return t("next_month");
  }

  return t("later");
}

/**
 * Sorts an array of objects by a specified field name.
 *
 * @template T extends Object
 * @param {Array<T>} array - The array of objects to be sorted.
 * @param {keyof T} field_name - The name of the field to sort by.
 * @param {('asc'|'desc')} [order='asc'] - The order of sorting: 'asc' for ascending, 'desc' for descending.
 * @returns {T[]} - The sorted array.
 *
 * @example
 * const data = [
 *   { name: 'John', age: 25 },
 *   { name: 'Jane', age: 22 },
 *   { name: 'Bob', age: 30 }
 * ];
 *
 * const sortedByName = sortByField(data, 'name');
 * // sortedByName = [{ name: 'Bob', age: 30 }, { name: 'Jane', age: 22 }, { name: 'John', age: 25 }]
 *
 * const sortedByAgeDesc = sortByField(data, 'age', 'desc');
 * // sortedByAgeDesc = [{ name: 'Bob', age: 30 }, { name: 'John', age: 25 }, { name: 'Jane', age: 22 }]
 */
export function sortByField(array, field_name, order = "asc") {
  const is_asc = order === "asc";

  return array.sort((a, b) => {
    if (typeof a[field_name] === "number" && typeof b[field_name] === "number") {
      return is_asc ? a[field_name] - b[field_name] : b[field_name] - a[field_name];
    } else {
      const a_str = String(a[field_name] ?? "");
      const b_str = String(b[field_name] ?? "");

      return is_asc ? a_str.localeCompare(b_str) : b_str.localeCompare(a_str);
    }
  });
}

/**
 * Wait at minimum of a specified amount of time after the given promise is given.
 * @param {number} ms - The minimum time to wait in milliseconds.
 * @param {() => Promise<any>} promise - The promise to wait for.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
export function waitAtLeast(promise, ms) {
  return new Promise((resolve) => {
    const start = Date.now();
    promise().then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, ms - elapsed);
      setTimeout(resolve, remaining);
    });
  });
}

/**
 * Waits for a specified amount of time.
 * @param {number} ms - The time to wait in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Task[]} tasks
 */
export function sortTasksByDueDate(tasks) {
  try {
    if (!tasks?.length) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const dayAfterTomorrowEnd = new Date(today);
    dayAfterTomorrowEnd.setDate(dayAfterTomorrowEnd.getDate() + 2);
    dayAfterTomorrowEnd.setHours(23, 59, 59, 999); // For range inclusion

    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + (6 - thisWeekEnd.getDay()));
    thisWeekEnd.setHours(23, 59, 59, 999); // For range inclusion

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;
    const nextMonthEnd = new Date(nextMonthYear, nextMonth + 1, 0);
    nextMonthEnd.setHours(23, 59, 59, 999); // For range inclusion

    const datesContext = {
      today,
      tomorrowEnd,
      dayAfterTomorrowEnd,
      thisWeekEnd,
      currentMonth,
      currentYear,
      nextMonth,
      nextMonthYear,
    };

    // Custom comparator for single sort
    tasks.sort((a, b) => {
      const catA = getTaskDateRank(a, datesContext);
      const catB = getTaskDateRank(b, datesContext);
      if (catA !== catB) return catA - catB;

      // Then by priority desc (true should be first)
      const priA = a.important ? 1 : 0;
      const priB = b.important ? 1 : 0;
      if (priA !== priB) return priB - priA; // Descending

      // Same category: sort by start_date asc (use Infinity for no date)
      const startA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const startB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      if (startA !== startB) return startA - startB;

      // Finally by name asc as tiebreaker
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return tasks;
  } catch (error) {
    console.warn("Error sorting tasks by due date:", error);
    return tasks;
  }
}

/**
 *
 * @param {Task} task
 * @param {Object} dates
 * @param {Date} dates.today
 * @param {Date} dates.tomorrowEnd
 * @param {Date} dates.dayAfterTomorrowEnd
 * @param {Date} dates.thisWeekEnd
 * @param {number} dates.currentMonth
 * @param {number} dates.currentYear
 * @param {number} dates.nextMonth
 * @param {number} dates.nextMonthYear
 * @returns {number}
 */
function getTaskDateRank(
  task,
  { today, tomorrowEnd, dayAfterTomorrowEnd, thisWeekEnd, currentMonth, currentYear, nextMonth, nextMonthYear }
) {
  if (!task.start_date) return 9; // no_date

  const start_day = new Date(task.start_date);
  start_day.setHours(0, 0, 0, 0);

  const due_day = new Date(task.due_date || task.start_date);
  due_day.setHours(23, 59, 59, 999);

  const is_started = start_day.getTime() <= today.getTime();
  const is_past = due_day.getTime() < today.getTime();
  const is_ongoing = is_started && !is_past;

  if (is_ongoing) return 1; // ongoing
  if (is_past) return 0; // past
  if (due_day.getTime() === tomorrowEnd.getTime()) return 3; // tomorrow
  if (due_day.getTime() === dayAfterTomorrowEnd.getTime()) return 4; // day after
  if (due_day.getTime() <= thisWeekEnd.getTime()) return 5; // this week (excluding earlier)
  if (due_day.getMonth() === currentMonth && due_day.getFullYear() === currentYear) return 6; // this month (excluding earlier)
  if (due_day.getMonth() === nextMonth && due_day.getFullYear() === nextMonthYear) return 7; // next month
  return 8; // later
}

/**
 * Normalize a string by trimming whitespace and converting to lowercase.
 * @param {*} str - The string to normalize.
 * @returns {string} - The normalized string.
 */
export function normalize(str) {
  if (typeof str !== "string") {
    throw new TypeError("Input must be a string");
  }

  return str.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Validates email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Retry helper with exponential backoff
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [retries=3]
 * @param {number} [delay=1000]
 * @param {string} [operation_name="operation"]
 * @returns {Promise<T>}
 */
export async function retry(fn, retries = 3, delay = 1000, operation_name = "operation") {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.log(`${operation_name} attempt ${i + 1} failed: ${error_message}`);

      const is_last_attempt = i === retries - 1;
      if (is_last_attempt) throw error;

      // Exponential backoff
      const wait_ms = delay * Math.pow(2, i);
      console.log(`Retrying ${operation_name} in ${wait_ms}ms...`);
      await wait(wait_ms);
    }
  }

  throw new Error(`${operation_name} failed after ${retries} attempts`);
}
