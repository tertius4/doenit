import { logApiExecutionTime } from "$logic/index.remote";

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
