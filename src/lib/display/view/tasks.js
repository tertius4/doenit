import { DB } from "$lib/DB";
import { map } from "rxjs";

/**
 *
 * @param {Task[]} list
 * @returns {() => void}
 */
export function taskList(list) {
  /** @type {Subscription} */
  let subscription;

  subscribeTaskList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<import("rxjs").Observable<Task[]>>}
 */
async function subscribeTaskList() {
    return DB.Task.stream({ selector: { archived: { $eq: true } }, sort: [{ completed: "desc" }] });
}
