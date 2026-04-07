import DB from "$lib/domain/db";
import { map } from "rxjs";

/**
 * @param {Logic.CategoryListItem[]} list
 * @returns {() => void}
 */
export function categoryList(list) {
  /** @type {Subscription} */
  let subscription;

  subscribeCategoryList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 *
 * @param {Logic.CategoryAssignTask[]} list
 * @returns {() => void}
 */
export function listAssignTask(list) {
  /** @type {Subscription} */
  let subscription;

  subscribeCategoryList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<import("rxjs").Observable<Logic.CategoryListItem[]>>}
 */
async function subscribeCategoryList() {
  const hash = new Map();
  const tasks_result = await DB.task.findMany({ selector: { archived: false } });
  if (!tasks_result.ok) throw Error(tasks_result.error);

  const tasks = tasks_result.value;
  for (const task of tasks) {
    if (!task.category_id) continue;
    if (task.archived) continue;

    const currentCount = hash.get(task.category_id) || 0;
    hash.set(task.category_id, currentCount + 1);
  }

  /** @type {(category: DB.Category) => Logic.CategoryListItem} */
  const formatCategory = (category) => {
    return {
      id: category.id,
      task_count: hash.get(category.id) || 0,
      name: category.name,
    };
  };

  return DB.category.subscribe$({ sort: [{ name: "asc" }] }).pipe(map((cats) => cats.map(formatCategory)));
}