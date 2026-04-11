import DB from "$lib/domain/db";
import { map, Subscription } from "rxjs";

/**
 *
 * @param {AL.MainPageTask[]} list
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
 * @returns {Promise<import("rxjs").Observable<AL.MainPageTask[]>>}
 */
async function subscribeTaskList() {
  // return [{

  // }]
  // /** @type {(task: DB.Task ) => Logic.MainPageTask} */
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
            is_ongoing: true,
            is_past: false,
            onclick: () => {},
            onlongpress: () => {},
            name: "Task 1",
            pills: [
              { type: "round", label: "12-13 Mrt. 2026", pre_icon: "clock", post_icon: "sync" },
              { type: "square", label: "Onderhoud", pre_icon: "categories" },
            ],
            top_right_icons: [{ name: "important" }, { name: "camera" }],
          },
          {
            id: "2",
            is_ongoing: false,
            is_past: true,
            onclick: () => {},
            onlongpress: () => {},
            name: "Task 2",
            pills: [{ type: "round", label: "12-13 Mrt. 2026", pre_icon: "clock", post_icon: "sync" }],
          },
        ]),
      )
  );
}
