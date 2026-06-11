import { deepEqual, apiLogger, syncApiLogger, getNextRepeatDates } from "$lib";
import { tempMediaManager } from "$logic/temp-media";
import DateUtil from "$display/date-util";
import t from "$lib/display/translate";
import logger from "$display/logger";
import DB from "$lib/domain/db";

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
  const result = !!task_id ? await DB.task.findById(task_id) : { ok: true, value: getNewTask() };
  if (!result.ok) return false;

  const original_task = result.value;

  return !deepEqual(original_task, updated_data);
}

/**
 * Returns a new Domain.Task object with default values for creating a new task.
 * @param {Partial<DB.Task>} [overrides={}] - Optional overrides for the default task data.
 * @returns {Domain.Task}
 */
function getNewTaskHandler(overrides = {}) {
  /** @type {Domain.Task} */
  const task = {
    name: "",
    archived: false,
    description: "",
    completed: 0,
    completed_at: null,
    due_date: null,
    start_date: null,
    repeat_interval: "",
    repeat_specific_days: [],
    repeat_interval_number: 1,
    important: false,
    assigned_firebase_uid: undefined,
    photo_ids: [],
    category_id: undefined,
    scope_id: undefined,

    ...overrides,
  };

  return task;
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

    const task = JSON.parse(JSON.stringify(task_result.value));
    if (!task) return { ok: false, error: t("task_not_found") };

    return { ok: true, value: task };
  } catch (error) {
    logger.error("Error fetching task by ID:", error);
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
        task.assigned_firebase_uid = undefined;
      }
    }

    const updated_task = await DB.task.update(task.id, task);
    if (!updated_task.ok) throw Error(updated_task.error);

    // Delete removed photos
    await tempMediaManager.commit(task.photo_ids);

    return { ok: true };
  } catch (error) {
    logger.error("Error updating task:", error);
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
    if (!result.ok) throw Error(result.error);

    const new_task = result.value;
    await tempMediaManager.commit(new_task.photo_ids);

    return { ok: true };
  } catch (error) {
    logger.error("Error creating task:", error);
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
    const result = await DB.task.remove(task_id);
    if (!result.ok) return result;

    return { ok: true };
  } catch (error) {
    logger.error("Error deleting task:", error);
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
    const next_repeat = getNextRepeatDates(task);

    if (task.archived) {
      task.completed = 0;
      task.archived = false;
      task.completed_at = null;
    } else if (next_repeat.is_repeat_task) {
      task.archived = true;
      task.completed += 1;
      task.start_date = next_repeat.start_date;
      task.due_date = next_repeat.due_date;
      task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    } else {
      task.completed += 1;
      task.archived = true;
      task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    }

    const result = await DB.task.update(task_id, task);
    if (next_repeat.is_repeat_task) {
      // For the animation.
      setTimeout(() => DB.task.update(task_id, { archived: false }), 300);
    }

    return result;
  } catch (error) {
    logger.error("Error completing task:", error);
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
    logger.error("Error uncompleting task:", error);
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
    logger.error("Error fetching tasks by IDs:", err);
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 * @param {Object} param0
 * @param {string[]} param0.ids
 * @returns {AsyncResult<string>}
 */
async function getShareTaskTextHandler({ ids }) {
  try {
    const result = await DB.task.findMany({ selector: { id: { $in: ids } } });
    if (!result.ok) return result;

    const tasks = result.value;
    const dot = tasks.length === 1 ? "" : "• ";
    const text = dot + tasks.map((task) => task.name).join(`,\n• `);

    return { ok: true, value: text };
  } catch (err) {
    logger.error("Error fetching tasks by IDs:", err);
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
      const is_repeat_task = task.repeat_interval && (task.due_date || task.start_date);

      if (!task.archived || !is_repeat_task) {
        tasks_to_delete.push(task.id);
      } else {
        tasks_to_update.push({ id: task.id, changes: { archived: false, completed: 0 } });
      }
    }

    const delete_result = await DB.task.removeMany(tasks_to_delete);
    if (!delete_result.ok) return delete_result;

    const update_result = await DB.task.updateMany(tasks_to_update);
    if (!update_result.ok) return update_result;

    return { ok: true };
  } catch (error) {
    logger.error("Error deleting all tasks:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}
