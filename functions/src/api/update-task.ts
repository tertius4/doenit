import { type Result } from "../shared/result";
import { type Access, API_DEVICE_ID, categoryNames, findTask, resolveCategory, writeItem } from "./store";
import { type PublicTask, markDone, parseTask, toPublicTask, toTaskBody } from "./task-fields";

/**
 * PATCH /v1/tasks/{id}: the sent fields are merged onto the task and validated as a whole, so the rules are the same
 * as for POST and `null` clears a field. `completed` completes or reopens it, like ticking it off in the app.
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
  const { task, scope_id } = found;

  const names = await categoryNames(scope_id);
  const current = toPublicTask(task, names);
  if ("group_id" in changes && (changes.group_id ?? null) !== current.group_id) {
    return { ok: false, error: "group_id can't be changed", status_code: 400 };
  }

  const parsed = parseTask({ ...toTaskBody(current), ...changes });
  if (!parsed.ok) return parsed;
  const { category, group_id: _group_id, ...fields } = parsed.value!;

  if (category !== current.category) {
    task.category_id = category ? await resolveCategory(access, scope_id, category) : null;
    if (category && task.category_id) names.set(task.category_id, category);
  }
  Object.assign(task, fields);

  if (completed === true && !task.archived) markDone(task);
  if (completed === false && task.archived) Object.assign(task, { completed: 0, archived: false, completed_at: null });

  Object.assign(task, { version: (task.version ?? 0) + 1, updated_at: new Date().toISOString(), device_id: API_DEVICE_ID });
  await writeItem(scope_id, task);

  return { ok: true, value: toPublicTask(task, names) };
}
