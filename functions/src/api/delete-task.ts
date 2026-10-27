import { type Result } from "../shared/result";
import { type Access, API_DEVICE_ID, findTask, writeItem } from "./store";

/** DELETE /v1/tasks/{id}: a soft delete with the full document, like the app's own deletes, so every device removes it. */
export async function deleteTask(access: Access, id: string): Promise<Result> {
  const found = await findTask(access, id);
  if (!found) return { ok: false, error: "Task not found", status_code: 404 };
  const { task, scope_id } = found;

  await writeItem(scope_id, {
    ...task,
    soft_deleted: true,
    version: (task.version ?? 0) + 1,
    updated_at: new Date().toISOString(),
    device_id: API_DEVICE_ID,
  });
  return { ok: true };
}
