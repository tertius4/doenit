import { SvelteSet } from "svelte/reactivity";

class SelectedClass {
  /** @type {SvelteSet<Category['id']>} */
  categories = new SvelteSet();
  /** @type {SvelteSet<Task['id']>} */
  tasks = new SvelteSet();
  /** @type {boolean} */
  do_now = $state(false);
}

export const Selected = new SelectedClass();
