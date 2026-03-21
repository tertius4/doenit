import DB from "$domain/db";
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

  subscribeCategoriesAssignTask()
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

  /** @type {(category: any, index: number, array: any[]) => Logic.CategoryListItem} */
  const formatCategory = (category, index, array) => {
    const previous = index > 0 ? array[index - 1] : null;
    return {
      has_title: index > 0 && !!category.users?.length && !previous?.users?.length,
      task_count: hash.get(category.id) || 0,
      id: category.id,
      name: category.name,
      users: category.users ?? [],
    };
  };

  return DB.category.subscribe$({ sort: [{ name: "asc" }] }).pipe(map((cats) => cats.map(formatCategory)));
}

async function subscribeCategoriesAssignTask() {
  /** @type {( category: DB.Category, index: number, array: any[] ) => Logic.CategoryAssignTask} */
  const formatCategory = (category, i, array) => ({
    id: category.id,
    name: category.name,
    show_shared_title: i > 0 && !!category.users?.length && !array[i - 1]?.users?.length,
  });

  return DB.category
    .subscribe$({ selector: { is_default: { $ne: true } }, sort: [{ name: "asc" }] })
    .pipe(map((cats) => cats.map(formatCategory)));
}
