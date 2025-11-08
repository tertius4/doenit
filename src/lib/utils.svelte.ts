export class Value<T> {
  #value: T | null = $state(null);

  // Manage from outside
  is_loading: boolean = $state(false);

  constructor(value?: T) {
    if (value) this.#value = value;
  }

  set value(value: T | null) {
    if (!value) value = null;
    if (value === this.#value) return;

    this.#value = value;
  }

  get value(): T | null {
    return this.#value;
  }
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
