/** Copies plain data (objects, arrays, primitives) recursively, so the copy can be changed without touching the original. */
export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T;
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)])) as T;
}
