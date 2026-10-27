import { type Result } from "../shared/result";
import { type Access, findTask, stampChange, writeItem } from "./store";

/** DELETE /v1/tasks/{id}: a soft delete with the full document, like the app's own deletes, so every device removes it. */
export async function deleteTask(access: Access, id: string): Promise<Result> {
  const found = await findTask(access, id);
  if (!found) return { ok: false, error: "Task not found", status_code: 404 };
  const { task, scope_id } = found;

  await writeItem(scope_id, stampChange(task, { ...task, soft_deleted: true }));
  return { ok: true };
}
