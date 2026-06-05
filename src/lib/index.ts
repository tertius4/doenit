import { logApiExecutionTime } from "$logic/index.remote";
import DateUtil from "$display/date-util";

export const BACK_BUTTON_FUNCTION: { value: symbol | null } = { value: null };

const REPEAT_INTERVALS: Record<string, (arg0: { date: Date; num?: number; specific_days?: number[] }) => number> = {
  daily: ({ date, num = 1 }) => date.setDate(date.getDate() + 1 * num),
  workdaily: ({ date }) => {
    const new_date = new Date(date);
    const day_of_week = new_date.getDay();
    if (day_of_week === 5) return date.setDate(date.getDate() + 3); // Friday -> Monday
    if (day_of_week === 6) return date.setDate(date.getDate() + 2); // Saturday -> Monday
    return date.setDate(date.getDate() + 1);
  },
  weekly: ({ date, num = 1 }) => date.setDate(date.getDate() + 7 * num),
  weekly_custom_days: ({ date, specific_days = [] }) => {
    if (!specific_days.length) return date.setDate(date.getDate() + 7);

    const currentDay = date.getDay();
    let daysToAdd = 7;

    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      if (specific_days.includes(checkDay)) {
        daysToAdd = i;
        break;
      }
    }

    return date.setDate(date.getDate() + daysToAdd);
  },
  monthly: ({ date, num = 1 }) => date.setMonth(date.getMonth() + 1 * num),
  yearly: ({ date, num = 1 }) => date.setFullYear(date.getFullYear() + 1 * num),
};

/** Wait at minimum of a specified amount of time after the given promise is given. */
export function waitAtLeast(promise: () => Promise<any>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    promise().then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, ms - elapsed);
      setTimeout(resolve, remaining);
    });
  });
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ok<T = void>(value?: T): Result<T> {
  return { ok: true, value } as Result<T>;
}

export function err<T = void>(error: string): Result<T> {
  return { ok: false, error } as Result<T>;
}

/**
 * Wraps an asynchronous function to log its execution time.
 */
export function apiLogger<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      const start_time = Date.now();
      const result = await fn(...args);
      const elapsed = Date.now() - start_time;
      logApiExecutionTime({ fn_name: fn.name, elapsed, args });
      return result;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error(`Error in ${fn.name}: ${error_message}`);
      return err(error_message) as Awaited<ReturnType<T>>;
    }
  };
}

/**
 * Wraps a synchronous function to log its execution time.
 */
export function syncApiLogger<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      const start_time = Date.now();
      const result = fn(...args);
      const elapsed = Date.now() - start_time;
      logApiExecutionTime({ fn_name: fn.name, elapsed, args });
      return result;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error(`Error in ${fn.name}: ${error_message}`);
      return err(error_message) as ReturnType<T>;
    }
  };
}

/**
 * Normalize a string by trimming whitespace and converting to lowercase.
 */
export function normalize(str: any): string {
  if (typeof str !== "string") {
    throw new TypeError("Input must be a string");
  }

  return str.trim().toLowerCase().replace(/\s+/g, "_");
}

export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) {
    console.debug("One or both objects are null/undefined");
    return false;
  }

  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    console.debug("Different number of keys");
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      console.debug(`Key missing in obj2: ${key}`);
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      console.debug(`Values differ for key: ${key}`);
      return false;
    }
  }

  return true;
}

/**
 * NOTE: Name kept as requested: getNextReapeatDate
 */
export function getNextRepeatDates(task: Domain.Task): {
  is_repeat_task: boolean;
  start_date: string | null;
  due_date: string | null;
} {
  const interval = task?.repeat_interval || "";
  const is_repeat_task = !!interval && (!!task.start_date || !!task.due_date);

  if (!is_repeat_task) {
    return {
      is_repeat_task: false,
      start_date: task.start_date ?? null,
      due_date: task.due_date ?? null,
    };
  }

  const repeat_interval_number = task.repeat_interval_number ?? 1;
  const repeat_specific_days = task.repeat_specific_days ?? [];

  return {
    is_repeat_task: true,
    start_date: getNextDateValue(task.start_date, interval, repeat_interval_number, repeat_specific_days),
    due_date: getNextDateValue(task.due_date, interval, repeat_interval_number, repeat_specific_days),
  };
}

function getNextDateValue(
  value: string | null | undefined,
  interval: string,
  repeat_interval_number = 1,
  repeat_specific_days: number[] = [],
): string | null {
  if (!value) return null;
  const calcNextDay = REPEAT_INTERVALS[interval];
  if (!calcNextDay) return value;

  const has_time = value.includes(" ");
  const new_day = new Date(
    calcNextDay({
      date: new Date(value),
      num: repeat_interval_number,
      specific_days: repeat_specific_days,
    }),
  );

  return DateUtil.format(new_day, has_time ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
}

export function capitalize(str: string): string {
  if (typeof str !== "string" || !str.length) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getInitials(str: string, maxLength = 2): string {
  if (typeof str !== "string" || !str.trim().length) {
    return "";
  }

  const words = str.trim().split(/\s+/);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
  return initials.slice(0, maxLength);
}
