import { SvelteSet } from "svelte/reactivity";

export const selected_tasks = new SvelteSet<string>();
export const selected_lists = new SvelteSet<string>();
