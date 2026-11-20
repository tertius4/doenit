import { type Result } from "../shared/result";
import { deepClone } from "../shared/clone";
import { type Access, findTask, scopeOfList, stampChange, tasksOfList, writeItem, writeTaskChanges } from "./store";
import { type PublicTask, markDone, nextRepeatDates, parseTask, toPublicTask, toTaskBody } from "./task-fields";
import { detach, isChainHead, restartChain } from "./chain";

/**
 * PATCH /v1/tasks/{id}: the sent fields are merged onto the task and validated as a whole, so the rules are the same
 * as for POST and `null` clears a field. `completed` completes or reopens it, like ticking it off in the app.
 * `list_id` may only change between lists in the same scope (private lists and the Inbox): moving a task to or from a
 * shared list gives it a new id in the other scope, which the app does.
 */
export async function updateTask(access: Access, id: string, body: unknown): Promise<Result<PublicTask>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object", status_code: 400 };
  }
  const { completed, ...changes } = body as Record<string, unknown>;
  if (completed !== undefined && typeof completed !== "boolean") {
    return { ok: false, error: "completed must be a boolean", status_code: 400 };
  }

  const found = await findTask(access, id);
  if (!found) return { ok: false, error: "Task not found", status_code: 404 };
  const { scope_id } = found;
  const task = deepClone(found.task);

  const current = toPublicTask(task);

  const parsed = parseTask({ ...toTaskBody(current), ...changes });
  if (!parsed.ok) return parsed;
  const { list_id, ...fields } = parsed.value!;

  if (list_id !== current.list_id) {
    const target_scope = await scopeOfList(access, list_id);
    if (!target_scope) return { ok: false, error: "Unknown list", status_code: 400 };
    if (target_scope !== scope_id) {
      return { ok: false, error: "A task can't move to or from a shared list through the API", status_code: 400 };
    }
  }
  const chain_tasks = await tasksOfList(scope_id, current.list_id);
  if (list_id !== current.list_id) {
    // A chain stays in one list: whatever waited on this task now waits on the task before it.
    await writeTaskChanges(scope_id, chain_tasks, detach(chain_tasks, id).filter((change) => change.id !== id));
    task.list_id = list_id;
    task.after_task_id = null;
  }
  Object.assign(task, fields);
  // Only the first task of a chain repeats; the others come back with it.
  if (task.after_task_id) Object.assign(task, { repeat_interval: "", repeat_interval_number: 1, repeat_specific_days: [] });

  const is_completion = completed === true && !task.archived;
  if (is_completion) markDone(task, list_id === current.list_id && isChainHead(chain_tasks, id));
  if (completed === false && task.archived) Object.assign(task, { completed: 0, archived: false, completed_at: null });

  const stamped = stampChange(found.task, task);
  await writeItem(scope_id, stamped);

  if (is_completion && list_id === current.list_id) {
    // A repeating chain that is now done starts over, as in the app.
    const tasks = chain_tasks.map((t) => (t.id === id ? stamped : t));
    const restart = restartChain(tasks, id, (head) => nextRepeatDates(head as typeof stamped));
    const by_id = new Map(tasks.map((t) => [t.id, t]));
    await writeTaskChanges(
      scope_id,
      tasks,
      restart.map((change) => ({
        ...change,
        archived: false,
        checklist: (by_id.get(change.id)?.checklist ?? []).map((item) => ({ ...item, done: false })),
      })),
    );
    const head_change = restart.find((change) => change.id === id);
    if (head_change) return { ok: true, value: toPublicTask({ ...stamped, ...head_change, archived: false }) };
  }

  return { ok: true, value: toPublicTask(stamped) };
}
