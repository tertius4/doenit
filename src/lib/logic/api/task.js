import { deepEqual, apiLogger, syncApiLogger, getNextRepeatDates } from "$lib";
import { tempMediaManager } from "$lib/services/photos.svelte";
import DateUtil from "$display/date-util";
import t from "$lib/display/translate";
import logger from "$display/logger";
import DB from "$lib/domain/db";
import { TaskNotifier } from "$logic/notifications/TaskNotifier";
import { leaveChain, moveTask } from "$logic/api/lists";
import { context } from "$logic/context.svelte";
import { cleanChecklist, resetChecklist, toggleChecklistItem } from "$logic/checklist";
import { detach, insertAfter, isChainHead, normalize, restartChain, successorsOf, wouldCycle } from "$logic/chains";
import { NotificationService } from "$logic/notifications/NotificationService";

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
export const toggleItem = apiLogger(toggleItemHandler);

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
    checklist: [],
    after_task_id: null,
    list_id: null,
    scope_id: null,

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
 * @returns {AsyncResult<DB.Task>} The saved task; its id is new when it moved to another scope.
 */
async function updateTaskHandler(task) {
  try {
    task.name = task.name?.trim();
    task.description = task.description?.trim() ?? "";
    if (!task.name) {
      return { ok: false, error: t("task_name_required") };
    }

    if (!!task.start_date && !!task.due_date && task.start_date > task.due_date) {
      return { ok: false, error: t("start_date_before_end") };
    }

    if (task.repeat_interval != "weekly_custom_days") {
      task.repeat_specific_days = [];
    }
    task.checklist = cleanChecklist(task.checklist);
    // Only the first task of a chain repeats; the others come back with it.
    if (task.after_task_id) clearRepeat(task);

    const original_task_result = await DB.task.findById(task.id);
    if (!original_task_result.ok || !original_task_result.value) {
      return { ok: false, error: t("task_not_found") };
    }

    const original_task = original_task_result.value;
    const list = await resolveList(task.list_id, original_task.list_id ?? null);
    if (!list.ok) return list;

    // A task that leaves its list leaves its chain too; otherwise it may get a new place in the chain.
    const list_changed = list.value.list_id !== (original_task.list_id ?? null);
    const chain_tasks = await tasksOfList(original_task.list_id);
    if (!chain_tasks.ok) return chain_tasks;
    const after_task_id = list_changed ? null : (task.after_task_id ?? null);
    if (wouldCycle(chain_tasks.value, task.id, after_task_id) || !inList(chain_tasks.value, after_task_id)) {
      return { ok: false, error: t("after_task_invalid") };
    }

    let is_repeat_completion = false;
    const is_completion = !original_task.archived && task.archived;
    if (original_task.archived !== task.archived) {
      if (original_task.archived) {
        task.completed = 0;
        task.archived = false;
        task.completed_at = null;
      } else {
        // The first task of a chain repeats only once the whole chain is done (see completeChain).
        const defer = isChainHead(chain_tasks.value, task.id);
        is_repeat_completion = markTaskDone(task, defer).is_repeat_task && !defer;
      }
    }

    // Everything but the list and the chain is saved in place; a new list may then move the task (new id).
    const updated_task = await DB.task.update(task.id, {
      ...task,
      list_id: original_task.list_id ?? null,
      scope_id: original_task.scope_id ?? null,
      after_task_id: original_task.after_task_id ?? null,
    });
    if (!updated_task.ok) throw Error(updated_task.error);

    const placed = await saveChain(insertAfter(chain_tasks.value, task.id, after_task_id));
    if (!placed.ok) return placed;

    const moved = await moveTask(updated_task.value, list.value.list_id, list.value.scope_id);
    if (!moved.ok) return moved;

    const saved = moved.value;
    TaskNotifier.assigned(saved, original_task.assigned_firebase_uid);
    if (is_completion) {
      TaskNotifier.completed(saved);
      await completeChain(saved);
    }
    if (is_repeat_completion) {
      // Same as completing from the list: the repeating task comes back with its next dates.
      setTimeout(() => DB.task.update(saved.id, { archived: false }), 500);
    }

    // Delete removed photos
    await tempMediaManager.commit(task.photo_ids);

    return { ok: true, value: saved };
  } catch (error) {
    logger.error("Error updating task:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

/**
 * The list a task is put in and that list's scope. A list that is gone leaves the task in the Inbox. A completed
 * project takes no new tasks; one already in it may still be edited.
 * @param {string | null | undefined} list_id
 * @param {string | null} [current_list_id] The list the task is in now, when it is edited.
 * @returns {AsyncResult<{ list_id: string | null, scope_id: string | null }>}
 */
async function resolveList(list_id, current_list_id = null) {
  if (!list_id) return { ok: true, value: { list_id: null, scope_id: null } };

  const list = await DB.list.findById(list_id);
  if (!list.ok) return list;
  if (!list.value || list.value.soft_deleted) return { ok: true, value: { list_id: null, scope_id: null } };
  if (list.value.completed_at && list.value.id !== current_list_id) return { ok: false, error: t("project_is_completed") };

  return { ok: true, value: { list_id: list.value.id, scope_id: list.value.scope_id ?? null } };
}

/**
 * @param {Domain.Task} task
 * @returns {AsyncResult}
 */
async function createTaskHandler(task) {
  try {
    const list = await resolveList(task.list_id);
    if (!list.ok) return list;

    const chain_tasks = await tasksOfList(list.value.list_id);
    if (!chain_tasks.ok) return chain_tasks;
    const after_task_id = task.after_task_id ?? null;
    if (!inList(chain_tasks.value, after_task_id)) return { ok: false, error: t("after_task_invalid") };
    if (after_task_id) clearRepeat(task);

    const result = await DB.task.create({
      ...task,
      checklist: cleanChecklist(task.checklist),
      after_task_id: null,
      ...list.value,
      // Nobody else can be assigned a task in a private list or the Inbox.
      ...(list.value.scope_id ? {} : { assigned_firebase_uid: undefined }),
    });
    if (!result.ok) throw Error(result.error);

    const new_task = result.value;
    const placed = await saveChain(insertAfter([...chain_tasks.value, new_task], new_task.id, after_task_id));
    if (!placed.ok) return placed;

    await tempMediaManager.commit(new_task.photo_ids);
    TaskNotifier.assigned(new_task);

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
    const left = await leaveChain(task_id);
    if (!left.ok) return left;

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
 * Marks an open task as done. A repeating task also moves on to its next dates, unless `defer` (the first task of a
 * chain, which repeats with the whole chain).
 * @param {DB.Task | Domain.Task} task - Mutated in place.
 * @param {boolean} [defer]
 * @returns {ReturnType<typeof getNextRepeatDates>}
 */
function markTaskDone(task, defer = false) {
  const next_repeat = defer ? { is_repeat_task: false, start_date: null, due_date: null } : getNextRepeatDates(task);

  task.completed += 1;
  task.archived = true;
  task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");

  if (next_repeat.is_repeat_task) {
    task.start_date = next_repeat.start_date;
    task.due_date = next_repeat.due_date;
    // The next time round starts with every item open again.
    task.checklist = resetChecklist(task.checklist);
  }

  return next_repeat;
}

/**
 * Ticks a checklist item on or off and saves it straight away, without the rest of the form.
 * @param {string} task_id
 * @param {string} item_id
 * @returns {AsyncResult<DB.Task>}
 */
async function toggleItemHandler(task_id, item_id) {
  const task = await DB.task.findById(task_id);
  if (!task.ok) return task;
  if (!task.value) return { ok: false, error: t("task_not_found") };

  return DB.task.update(task_id, { checklist: toggleChecklistItem(task.value.checklist, item_id) });
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
    const was_open = !task.archived;
    let is_repeat_task = false;

    if (task.archived) {
      task.completed = 0;
      task.archived = false;
      task.completed_at = null;
    } else {
      const chain_tasks = await tasksOfList(task.list_id);
      const defer = chain_tasks.ok && isChainHead(chain_tasks.value, task.id);
      is_repeat_task = markTaskDone(task, defer).is_repeat_task;
    }

    const result = await DB.task.update(task_id, task);
    if (result.ok && was_open) {
      TaskNotifier.completed(result.value);
      await completeChain(result.value);
    }
    if (is_repeat_task) {
      // Let the task finish sliding out of the list before it re-enters (see TASK_OUT_MS in task-transitions.svelte.js).
      setTimeout(() => DB.task.update(task_id, { archived: false }), 500);
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
 * @param {boolean} [param0.reset_repeating] - Reset completed repeating tasks instead of deleting them (done page).
 * @returns {AsyncResult}
 */
async function deleteAllHandler({ ids, reset_repeating = false }) {
  try {
    const result = await DB.task.findMany({ selector: { id: { $in: ids } } });
    if (!result.ok) return result;

    const tasks = result.value;
    const tasks_to_delete = [];
    const tasks_to_update = [];

    for (const task of tasks) {
      const is_repeat_task = task.repeat_interval && (task.due_date || task.start_date);
      const is_done = task.archived;

      if (reset_repeating && is_repeat_task && !is_done) {
        tasks_to_update.push({ id: task.id, changes: { completed: 0, completed_at: null } });
      } else {
        tasks_to_delete.push(task.id);
      }
    }

    for (const id of tasks_to_delete) {
      const left = await leaveChain(id);
      if (!left.ok) return left;
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

// Chains: tasks in one list that wait on each other (see logic/chains.ts).

/**
 * @param {Domain.Task} task - Mutated in place.
 */
function clearRepeat(task) {
  task.repeat_interval = "";
  task.repeat_specific_days = [];
  task.repeat_interval_number = 1;
}

/**
 * The tasks of a list (null: the Inbox) that can be in a chain.
 * @param {string | null | undefined} list_id
 * @returns {AsyncResult<DB.Task[]>}
 */
function tasksOfList(list_id) {
  return DB.task.findMany({ selector: { list_id: list_id ?? null, soft_deleted: { $ne: true } } });
}

/**
 * @param {DB.Task[]} tasks
 * @param {string | null} id
 */
function inList(tasks, id) {
  return !id || tasks.some((task) => task.id === id);
}

/**
 * Saves new places in a chain, then mends a chain that a sync conflict split in two.
 * @param {import("$logic/chains").Change[]} changes
 * @returns {AsyncResult}
 */
async function saveChain(changes) {
  for (const { id, after_task_id } of changes) {
    const result = await DB.task.update(id, { after_task_id });
    if (!result.ok) return result;
  }
  return { ok: true };
}

/**
 * After a task is completed: the next task's assignee hears it is their turn, and a repeating chain that is done
 * starts over. Also mends a chain that a sync conflict split in two.
 * @param {DB.Task} task
 */
async function completeChain(task) {
  const tasks = await tasksOfList(task.list_id);
  if (!tasks.ok) return;

  await saveChain(normalize(tasks.value));

  const restart = restartChain(tasks.value, task.id, (head) => getNextRepeatDates(/** @type {any} */ (head)));
  for (const change of restart) {
    const current = tasks.value.find((t) => t.id === change.id);
    await DB.task.update(change.id, {
      archived: false,
      start_date: change.start_date,
      due_date: change.due_date,
      checklist: resetChecklist(current?.checklist),
    });
  }
  if (restart.length) return;

  const my_uid = context.user?.firebase_uid;
  for (const next of successorsOf(tasks.value, task.id)) {
    if (next.archived || !next.assigned_firebase_uid || next.assigned_firebase_uid === my_uid) continue;
    const sent = await NotificationService.createTaskUnblocked(next.assigned_firebase_uid, next, task);
    if (!sent.ok) logger.warn("[notifications] failed to notify unblocked task:", sent.error);
  }
}
