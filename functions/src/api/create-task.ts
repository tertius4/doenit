import { randomUUID } from "crypto";
import { type Result } from "../shared/result";
import { type Access, API_DEVICE_ID, scopeOfList, writeItem } from "./store";
import { type PublicTask, type StoredTask, parseTask, toPublicTask } from "./task-fields";

/** POST /v1/tasks: writes the task straight into its list's scope, so every device pulls it within seconds. */
export async function createTask(access: Access, body: unknown): Promise<Result<PublicTask>> {
  const parsed = parseTask(body);
  if (!parsed.ok) return parsed;
  const { list_id, ...fields } = parsed.value!;

  const scope_id = await scopeOfList(access, list_id);
  if (!scope_id) return { ok: false, error: "Unknown list", status_code: 400 };

  const now = new Date().toISOString();
  const task: StoredTask = {
    ...fields,
    id: randomUUID(),
    collection: "task",
    archived: false,
    completed: 0,
    completed_at: null,
    list_id,
    photo_ids: [],
    // Personal documents keep scope_id null; a shared list's tasks carry its scope.
    scope_id: scope_id === access.personal_scope ? null : scope_id,
    owner_id: access.uid,
    device_id: API_DEVICE_ID,
    version: 0,
    created_at: now,
    updated_at: now,
    soft_deleted: false,
  };
  await writeItem(scope_id, task);

  return { ok: true, value: toPublicTask(task) };
}
