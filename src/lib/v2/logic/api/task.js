import { t } from "$lib/services/language.svelte";
import { tempMediaManager } from "../temp-media";
import { DateUtil } from "$lib/core/date_util";
import { deepEqual } from "$lib/utils.svelte";
import { Logger } from "$lib/core/logger";
import DB from "$domain/db";
import { apiLogger, syncApiLogger } from "$lib";
import { context } from "$logic/context.svelte";

export const updateTask = apiLogger(updateTaskHandler);
export const isTaskUpdated = apiLogger(isTaskUpdatedHandler);
export const getNewTask = syncApiLogger(getNewTaskHandler);
export const getTaskById = apiLogger(getTaskByIdHandler);
export const createTask = apiLogger(createTaskHandler);
export const deleteTask = apiLogger(deleteTaskHandler);
export const complete = apiLogger(completeTaskHandler);
export const uncomplete = apiLogger(uncompleteTaskHandler);
export const getTasksByIds = apiLogger(getTasksByIdsHandler);
export const getShareTaskText = apiLogger(getShareTaskTextHandler);
export const deleteAll = apiLogger(deleteAllHandler);

/**
 * @param {DB.Task['id'] | undefined} task_id
 * @param {DB.Task | Domain.Task} updated_data
 * @returns {Promise<boolean>}
 */
async function isTaskUpdatedHandler(task_id, updated_data) {
  const original_task = !!task_id ? await DB.task.findById(task_id) : getNewTask();
  return !deepEqual(original_task, updated_data);
}

/**
 * Returns a new Domain.Task object with default values for creating a new task.
 * @param {Partial<Domain.Task>} [overrides={}] - Optional overrides for the default task data.
 * @returns {Domain.Task}
 */
function getNewTaskHandler(overrides = {}) {
  return {
    name: "",
    due_date: null,
    start_date: null,
    completed: 0,
    repeat_specific_days: [],
    completed_at: null,
    important: false,
    repeat_interval: "",
    repeat_interval_number: 1,
    category_id: undefined,
    assigned_user_email: undefined,
    photo_ids: [],
    ...overrides,
  };
}

/**
 * @param {string | undefined} task_id
 * @returns {AsyncResult<DB.Task>}
 */
async function getTaskByIdHandler(task_id) {
  try {
    if (!task_id) throw Error("Kon nie taak vind nie.");

    const task_result = await DB.task.findById(task_id);
    if (!task_result.ok) return task_result;

    const task = task_result.value;
    if (!task) return { ok: false, error: t("task_not_found") };

    return { ok: true, value: task };
  } catch (error) {
    Logger.error("Error fetching task by ID:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 * @param {DB.Task} task
 * @returns {AsyncResult}
 */
async function updateTaskHandler(task) {
  try {
    task.name = task.name?.trim();
    if (!task.name) {
      return { ok: false, error: t("task_name_required") };
    }

    if (!!task.start_date && !!task.due_date && task.start_date > task.due_date) {
      return { ok: false, error: t("start_date_before_end") };
    }

    if (task.repeat_interval != "weekly_custom_days") {
      task.repeat_specific_days = [];
    }

    const original_task_result = await DB.task.findById(task.id);
    if (!original_task_result.ok || !original_task_result.value) {
      return { ok: false, error: t("task_not_found") };
    }

    const original_task = original_task_result.value;
    if (original_task.archived !== task.archived) {
      if (original_task.archived) {
        task.completed = 0;
        task.archived = false;
        task.completed_at = null;
      } else {
        task.completed++;
        task.archived = true;
        task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
      }
    }

    // Validate category and assigned user
    if (task.category_id) {
      const category_result = await DB.category.findById(task.category_id);
      if (!category_result.ok) {
        return { ok: false, error: t("category_not_found") };
      }

      if (!category_result.value) {
        task.category_id = undefined;
        task.assigned_user_email = undefined;
      }
    }

    const updated_task = await DB.task.update(task.id, task);
    if (!updated_task.ok) throw Error(updated_task.error);

    // Delete removed photos
    await tempMediaManager.commit(task.photo_ids);

    return { ok: true };
  } catch (error) {
    Logger.error("Error updating task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 * @param {Domain.Task} task
 * @returns {AsyncResult}
 */
async function createTaskHandler(task) {
  try {
    const result = await DB.task.create(task);
    if (!result.ok) return result;

    const new_task = result.value;
    await tempMediaManager.commit(new_task.photo_ids);

    return { ok: true };
  } catch (error) {
    Logger.error("Error creating task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 *
 * @param {string} task_id
 * @returns {AsyncResult}
 */
async function deleteTaskHandler(task_id) {
  try {
    await DB.task.remove(task_id);
    return { ok: true };
  } catch (error) {
    Logger.error("Error deleting task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 *
 * @param {string} task_id
 * @returns {AsyncResult<DB.Task>}
 */
async function completeTaskHandler(task_id) {
  try {
    const task_result = await DB.task.findById(task_id);
    if (!task_result.ok || !task_result.value) {
      return { ok: false, error: t("task_not_found") };
    }

    const task = task_result.value;
    if (task.archived) {
      task.completed = 0;
      task.archived = false;
      task.completed_at = null;
    } else {
      task.completed++;
      task.archived = true;
      task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    }

    return DB.task.update(task_id, task);
  } catch (error) {
    Logger.error("Error completing task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    if (message === "NOT_FOUND") {
      return { ok: false, error: t("task_not_found") };
    }

    return { ok: false, error: message };
  }
}

/**
 *
 * @param {string} id
 * @returns {AsyncResult}
 */
async function uncompleteTaskHandler(id) {
  try {
    const task_result = await DB.task.findById(id);
    if (!task_result.ok || !task_result.value) {
      return { ok: false, error: t("task_not_found") };
    }

    const task = task_result.value;
    task.completed = 0;
    task.archived = false;
    task.completed_at = null;

    const result = await DB.task.update(task.id, task);
    if (!result.ok) return result;

    return { ok: true };
  } catch (error) {
    Logger.error("Error uncompleting task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 *
 * @param {string[]} task_ids
 * @returns {AsyncResult<DB.Task[]>}
 */
async function getTasksByIdsHandler(task_ids) {
  try {
    return DB.task.findMany({ selector: { id: { $in: task_ids } } });
  } catch (err) {
    Logger.error("Error fetching tasks by IDs:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 *
 * @param {string[]} task_ids
 * @returns {AsyncResult<string>}
 */
async function getShareTaskTextHandler(task_ids) {
  try {
    const result = await DB.task.findMany({ selector: { id: { $in: task_ids } } });
    if (!result.ok) return result;

    const tasks = result.value;
    const dot = tasks.length === 1 ? "" : "• ";
    const text = dot + tasks.map((task) => task.name).join(`,\n• `);

    return { ok: true, value: text };
  } catch (err) {
    Logger.error("Error fetching tasks by IDs:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 * @param {Object} param0
 * @param {string[]} param0.ids
 * @returns {AsyncResult}
 */
async function deleteAllHandler({ ids }) {
  try {
    const result = await DB.task.findMany({ selector: { id: { $in: ids } } });
    if (!result.ok) return result;

    const tasks = result.value;
    const tasks_to_delete = [];
    const tasks_to_update = [];

    for (const task of tasks) {
      const is_repeat_task = task.repeat_interval && task.due_date;

      if (!task.archived || !is_repeat_task) {
        tasks_to_delete.push(task.id);
      } else {
        tasks_to_update.push({ id: task.id, changes: { archived: false, completed: 0 } });
      }
    }

    await DB.task.removeMany(tasks_to_delete);
    await DB.task.updateMany(tasks_to_update);

    return { ok: true };
  } catch (error) {
    Logger.error("Error deleting all tasks:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}
