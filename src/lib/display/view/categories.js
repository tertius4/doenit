import t from "$display/translate";
import DB from "$lib/domain/db";
import { map, Subscription, Observable, combineLatest } from "rxjs";

/**
 * @param {AL.CategoryListItem[]} list
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
 * @param {AL.CategoryListItem[]} list
 * @returns {() => void}
 */
export function hotbarCategoryList(list) {
  /** @type {Subscription} */
  let subscription;

  subscribeHotbarCategoryList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 *
 * @param {AL.CategoryListItem[]} list
 * @returns {() => void}
 */
export function listAssignTask(list) {
  /** @type {Subscription} */
  let subscription;

  subscribeCategoryList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<Observable<AL.CategoryListItem[]>>}
 */
async function subscribeCategoryList() {
  const categories$ = DB.category.subscribe$({ sort: [{ name: "asc" }] });
  const tasks$ = DB.task.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([categories$, tasks$]).pipe(
    map(([cats, tasks]) => {
      const hash = new Map();

      for (const task of tasks) {
        const category_id = task.category_id || "default";

        const current_count = hash.get(category_id) || 0;
        hash.set(category_id, current_count + 1);
      }

      /** @type {(category: DB.Category) => AL.CategoryListItem} */
      const formatCategory = (category) => ({
        id: category.id,
        task_count: hash.get(category.id) || 0,
        name: category.name,
      });

      const default_category = {
        id: "default",
        name: t("DEFAULT_NAME"),
        task_count: hash.get("default") || 0,
      };

      return [default_category, ...cats.map(formatCategory)];
    }),
  );
}

async function subscribeHotbarCategoryList() {
  const categories$ = DB.category.subscribe$({ sort: [{ name: "asc" }] });
  const tasks$ = DB.task.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([categories$, tasks$]).pipe(
    map(([cats, tasks]) => {
      const hash = new Map();

      for (const task of tasks) {
        const category_id = task.category_id || "default";

        const current_count = hash.get(category_id) || 0;
        hash.set(category_id, current_count + 1);
      }

      /** @type {(category: DB.Category) => AL.CategoryListItem} */
      const formatCategory = (category) => ({
        id: category.id,
        task_count: hash.get(category.id) || 0,
        name: category.name,
      });

      const default_category = {
        id: "default",
        name: t("DEFAULT_NAME"),
        task_count: hash.get("default") || 0,
      };

      return [default_category, ...cats.map(formatCategory)];
    }),
  );
}
