import t from "$display/translate";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { combineLive } from "./live";
import { visibleLive } from "./visible";

/** @returns {import("@tertius4/sinkro-db").Live<[DB.Category[], DB.Task[]]>} */
function categoriesAndTasks() {
  const categories = visibleLive(DB.category, { sort: ["name"] });
  const tasks = visibleLive(DB.task, { where: { archived: { $ne: true } } });
  return combineLive([categories, tasks], (categories, tasks) => [categories, tasks]);
}

/**
 * @param {DB.Category[]} cats
 * @param {DB.Task[]} tasks
 * @returns {{ default_category: AL.CategoryListItem, list: AL.CategoryListItem[] }}
 */
function countTasks(cats, tasks) {
  const hash = new Map();

  for (const task of tasks) {
    const task_firebase_uid = task.assigned_firebase_uid;
    if (task_firebase_uid && task_firebase_uid !== context.user?.firebase_uid) continue;

    const category_id = task.category_id || "default";

    const current_count = hash.get(category_id) || 0;
    hash.set(category_id, current_count + 1);
  }

  return {
    default_category: { id: "default", name: t("DEFAULT_NAME"), task_count: hash.get("default") || 0 },
    list: cats.map((category) => ({
      id: category.id,
      task_count: hash.get(category.id) || 0,
      name: category.name,
    })),
  };
}

/** @returns {import("@tertius4/sinkro-db").Live<AL.CategoryListItem[]>} */
export function categoryList() {
  return combineLive([categoriesAndTasks()], ([cats, tasks]) => {
    const { default_category, list } = countTasks(cats, tasks);
    return [default_category, ...list];
  });
}

/** @returns {import("@tertius4/sinkro-db").Live<AL.CategoryListItem[]>} */
export function hotbarCategoryList() {
  return combineLive([categoriesAndTasks()], ([cats, tasks]) => {
    const { default_category, list } = countTasks(cats, tasks);
    const sorted = list.sort((a, b) => b.task_count - a.task_count || a.name.localeCompare(b.name));
    return [default_category, ...sorted];
  });
}
