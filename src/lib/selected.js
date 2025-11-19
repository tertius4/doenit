import { SvelteSet } from "svelte/reactivity";

export class Selected {
  /** @type {SvelteSet<Category['id']>} */
  static categories = new SvelteSet();
  /** @type {SvelteSet<Task['id']>} */
  static tasks = new SvelteSet();
}
