import DB from "$lib/domain/db";
import { map, Subscription } from "rxjs";

/**
 * @param {AL.DonePageTask[]} list
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
 * @returns {Promise<import("rxjs").Observable<AL.DonePageTask[]>>}
 */
async function subscribeTaskList() {
  // return [{

  // }]
  // /** @type {(task: DB.Task ) => AL.DonePageTask} */
  // const formatTask = (task) => ({
  //   id: task.id,

  // });

  return (
    DB.task
      .subscribe$({ selector: { archived: { $eq: true } }, sort: [{ completed: "desc" }] })
      // .pipe(map((tasks) => tasks.map(formatTask)));
      .pipe(
        map((tasks) => [
          {
            id: "1",
            completed_count: 5,
            is_selected: false,
            name: "Task 1",
            pills: [
              { type: "round", label: "12-13 Mrt. 2026", pre_icon: "clock", post_icon: "sync" },
              { type: "square", label: "Onderhoud", pre_icon: "categories" },
            ],
          },
          {
            id: "2",
            completed_count: 1,
            is_selected: false,
            name: "Task 2",
            pills: [{ type: "round", label: "12-13 Mrt. 2026", pre_icon: "clock", post_icon: "sync" }],
          },
        ]),
      )
  );
}
