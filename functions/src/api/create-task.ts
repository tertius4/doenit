import { randomUUID } from "crypto";
import { type Result } from "../shared/result";
import { type Access, API_DEVICE_ID, resolveCategory, scopeOf, writeItem } from "./store";
import { type PublicTask, type StoredTask, parseTask, toPublicTask } from "./task-fields";

/** POST /v1/tasks: writes the task straight into its scope, so every device pulls it within seconds. */
export async function createTask(access: Access, body: unknown): Promise<Result<PublicTask>> {
  const parsed = parseTask(body);
  if (!parsed.ok) return parsed;
  const { category, group_id, ...fields } = parsed.value!;

  if (group_id && !access.group_scopes.includes(group_id)) return { ok: false, error: "Unknown group", status_code: 400 };

  const scope_id = scopeOf(access, group_id);
  const category_id = category ? await resolveCategory(access, scope_id, category) : null;

  const now = new Date().toISOString();
  const task: StoredTask = {
    ...fields,
    id: randomUUID(),
    collection: "task",
    archived: false,
    completed: 0,
    completed_at: null,
    category_id,
    photo_ids: [],
    scope_id: group_id,
    owner_id: access.uid,
    device_id: API_DEVICE_ID,
    version: 0,
    created_at: now,
    updated_at: now,
    soft_deleted: false,
  };
  await writeItem(scope_id, task);

  return { ok: true, value: toPublicTask(task, new Map(category_id ? [[category_id, category!]] : [])) };
}
