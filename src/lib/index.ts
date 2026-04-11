import { logApiExecutionTime } from "$logic/index.remote";

export const BACK_BUTTON_FUNCTION: { value: symbol | null } = { value: null };

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

  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}
