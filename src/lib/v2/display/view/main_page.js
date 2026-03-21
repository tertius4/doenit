import DB from "$domain/db";
import { map } from "rxjs";

/**
 *
 * @param {Logic.MainPageTask[]} list
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
 * @returns {Promise<import("rxjs").Observable<{ id: string, name: string }[]>>}
 */
async function subscribeTaskList() {
  /** @type {(task: Logic.MainPageTask) => { id: string, name: string }} */
  const formatTask = (task) => ({
    id: task.id,
    name: task.name,
  });

  return DB.task
    .subscribe$({ selector: { archived: { $eq: true } }, sort: [{ completed: "desc" }] })
    .pipe(map((tasks) => tasks.map(formatTask)));
}
