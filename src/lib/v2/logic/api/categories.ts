import t from "$display/translate";
import { context } from "$logic/context.svelte";
import { alert } from "$lib/core/alert";
import { apiLogger } from "$lib";
import DB from "$domain/db";

export const mapTasksCountToCategories = apiLogger(mapTasksCountToCategoriesHandler);
export const save = apiLogger(saveCategoryHandler);
export const update = apiLogger(updateCategoryHandler);
export const remove = apiLogger(deleteCategoryHandler);
export const getCategoryById = apiLogger(getCategoryByIdHandler);

async function mapTasksCountToCategoriesHandler(): Promise<Map<DB.Category["id"], number>> {
  const tasks_result = await DB.task.findMany();
  if (!tasks_result.ok) throw new Error(tasks_result.error);
  const tasks = tasks_result.value;

  const map = new Map<DB.Category["id"], number>();

  for (const task of tasks) {
    if (!task.archived) continue;

    const category_id = task.category_id || "default";
    const count = map.get(category_id) || 0;
    map.set(category_id, count + 1);
  }

  return map;
}

async function saveCategoryHandler({ id, name }: Partial<DB.Category>): AsyncResult<DB.Category> {
  try {
    if (id) {
      return DB.category.update(id, { name });
    } else {
      return DB.category.create({
        owner_user_id: context.user?.id || "device",
        name: name || "",
      });
    }
  } catch (err) {
    console.error("Error creating category:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function updateCategoryHandler(id: string, update: { name: string }): AsyncResult {
  try {
    if (!id) throw Error(t("category_not_found"));
    if (!update.name?.trim()) throw Error(t("enter_category_name"));

    await DB.category.update(id, { name: update.name });

    return { ok: true };
  } catch (err) {
    console.error("Error updating category:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function deleteCategoryHandler(id: string): AsyncResult {
  try {
    if (!id) return { ok: false, error: t("cannot_delete_default_category") };

    await DB.category.remove(id);

    return { ok: true };
  } catch (err) {
    console.error("Error deleting category:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function getCategoryByIdHandler(id: string): Promise<DB.Category | null> {
  try {
    const category = await DB.category.findById(id);
    return category.ok ? category.value : null;
  } catch (error) {
    console.error("Error fetching category:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    alert.error(message);
    return null;
  }
}
