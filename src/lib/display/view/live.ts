import type { Live } from "@tertius4/sinkro-db";

/**
 * One live value made from several: `combine` runs once all have answered, and again when any changes. A result equal
 * to the last one is not sent again, so nothing on screen rerenders for it.
 */
export function combineLive<T extends unknown[], R>(
  sources: { [K in keyof T]: Live<T[K]> },
  combine: (...values: T) => R,
): Live<R> {
  return {
    subscribe(next, error) {
      const values = new Array(sources.length) as T;
      const answered = new Set<number>();
      let last: string | undefined;

      const stops = sources.map((source, index) =>
        source.subscribe((value) => {
          values[index] = value;
          answered.add(index);
          if (answered.size < sources.length) return;

          const result = combine(...values);
          const json = JSON.stringify(result);
          if (last !== undefined && json === last) return;
          last = json;
          next(result);
        }, error),
      );

      const stop = () => stops.forEach((unsubscribe) => unsubscribe());
      return Object.assign(stop, { unsubscribe: stop });
    },
  };
}
